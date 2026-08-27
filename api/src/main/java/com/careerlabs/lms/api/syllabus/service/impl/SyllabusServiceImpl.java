package com.careerlabs.lms.api.syllabus.service.impl;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.material.repository.MaterialRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.session.entity.Session;
import com.careerlabs.lms.api.session.repository.SessionRepository;
import com.careerlabs.lms.api.syllabus.dto.request.ReorderRequest;
import com.careerlabs.lms.api.syllabus.dto.request.SyllabusModuleRequest;
import com.careerlabs.lms.api.syllabus.dto.request.SyllabusTopicRequest;
import com.careerlabs.lms.api.syllabus.dto.response.SyllabusModuleResponse;
import com.careerlabs.lms.api.syllabus.dto.response.SyllabusTopicResponse;
import com.careerlabs.lms.api.syllabus.entity.SyllabusModule;
import com.careerlabs.lms.api.syllabus.entity.SyllabusTopic;
import com.careerlabs.lms.api.syllabus.repository.SyllabusModuleRepository;
import com.careerlabs.lms.api.syllabus.repository.SyllabusTopicRepository;
import com.careerlabs.lms.api.syllabus.service.SyllabusService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SyllabusServiceImpl implements SyllabusService {

    private final SyllabusModuleRepository moduleRepository;
    private final SyllabusTopicRepository topicRepository;
    private final SessionRepository sessionRepository;
    private final MaterialRepository materialRepository;
    private final CourseRepository courseRepository;
    private final CourseAccessGuard accessGuard;

    public SyllabusServiceImpl(SyllabusModuleRepository moduleRepository, SyllabusTopicRepository topicRepository,
                                SessionRepository sessionRepository, MaterialRepository materialRepository,
                                CourseRepository courseRepository, CourseAccessGuard accessGuard) {
        this.moduleRepository = moduleRepository;
        this.topicRepository = topicRepository;
        this.sessionRepository = sessionRepository;
        this.materialRepository = materialRepository;
        this.courseRepository = courseRepository;
        this.accessGuard = accessGuard;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SyllabusModuleResponse> listTree(Long courseId, JwtUserPrincipal principal) {
        findCourseOrThrow(courseId);
        accessGuard.requireContentAccess(principal, courseId);

        return reloadTree(courseId);
    }

    @Override
    @Transactional
    public SyllabusModuleResponse createModule(Long courseId, SyllabusModuleRequest request) {
        Course course = findCourseOrThrow(courseId);

        SyllabusModule module = new SyllabusModule();
        module.setCourse(course);
        module.setTitle(request.getTitle());
        module.setOrderIndex(moduleRepository.countByCourseId(courseId));

        return SyllabusModuleResponse.from(moduleRepository.save(module), List.of());
    }

    @Override
    @Transactional
    public SyllabusModuleResponse updateModule(Long id, SyllabusModuleRequest request) {
        SyllabusModule module = findModuleOrThrow(id);
        module.setTitle(request.getTitle());
        moduleRepository.save(module);

        List<SyllabusTopicResponse> topics = topicRepository.findAllByModuleIdOrderByOrderIndexAsc(id).stream()
                .map(SyllabusTopicResponse::from)
                .toList();
        return SyllabusModuleResponse.from(module, topics);
    }

    @Override
    @Transactional
    public void deleteModule(Long id) {
        SyllabusModule module = findModuleOrThrow(id);
        List<SyllabusTopic> topics = topicRepository.findAllByModuleIdOrderByOrderIndexAsc(id);
        List<Long> topicIds = topics.stream().map(SyllabusTopic::getId).toList();

        if (!topicIds.isEmpty()) {
            List<Session> sessions = sessionRepository.findAllByTopicIdInOrderByOrderIndexAsc(topicIds);
            List<Long> sessionIds = sessions.stream().map(Session::getId).toList();
            if (!sessionIds.isEmpty()) {
                materialRepository.deleteAllBySessionIdIn(sessionIds);
            }
            sessionRepository.deleteAllByTopicIdIn(topicIds);
            materialRepository.deleteAllByTopicIdIn(topicIds);
        }

        materialRepository.deleteAllByModuleIdIn(List.of(id));
        topicRepository.deleteAllByModuleId(id);
        moduleRepository.delete(module);
    }

    @Override
    @Transactional
    public List<SyllabusModuleResponse> reorderModules(Long courseId, ReorderRequest request) {
        findCourseOrThrow(courseId);
        List<SyllabusModule> modules = moduleRepository.findAllByCourseIdOrderByOrderIndexAsc(courseId);
        Map<Long, SyllabusModule> byId = new HashMap<>();
        modules.forEach(m -> byId.put(m.getId(), m));

        int index = 0;
        for (Long id : request.getOrderedIds()) {
            SyllabusModule module = byId.get(id);
            if (module != null) {
                module.setOrderIndex(index++);
            }
        }
        moduleRepository.saveAll(modules);

        return reloadTree(courseId);
    }

    @Override
    @Transactional
    public SyllabusTopicResponse createTopic(Long moduleId, SyllabusTopicRequest request) {
        SyllabusModule module = findModuleOrThrow(moduleId);

        SyllabusTopic topic = new SyllabusTopic();
        topic.setModule(module);
        topic.setTitle(request.getTitle());
        topic.setOrderIndex(topicRepository.countByModuleId(moduleId));

        return SyllabusTopicResponse.from(topicRepository.save(topic));
    }

    @Override
    @Transactional
    public SyllabusTopicResponse updateTopic(Long id, SyllabusTopicRequest request) {
        SyllabusTopic topic = findTopicOrThrow(id);
        topic.setTitle(request.getTitle());
        return SyllabusTopicResponse.from(topicRepository.save(topic));
    }

    @Override
    @Transactional
    public void deleteTopic(Long id) {
        SyllabusTopic topic = findTopicOrThrow(id);
        List<Session> sessions = sessionRepository.findAllByTopicIdOrderByOrderIndexAsc(id);
        List<Long> sessionIds = sessions.stream().map(Session::getId).toList();
        if (!sessionIds.isEmpty()) {
            materialRepository.deleteAllBySessionIdIn(sessionIds);
        }
        sessionRepository.deleteAllByTopicId(id);
        materialRepository.deleteAllByTopicIdIn(List.of(id));
        topicRepository.delete(topic);
    }

    @Override
    @Transactional
    public List<SyllabusTopicResponse> reorderTopics(Long moduleId, ReorderRequest request) {
        findModuleOrThrow(moduleId);
        List<SyllabusTopic> topics = topicRepository.findAllByModuleIdOrderByOrderIndexAsc(moduleId);
        Map<Long, SyllabusTopic> byId = new HashMap<>();
        topics.forEach(t -> byId.put(t.getId(), t));

        int index = 0;
        for (Long id : request.getOrderedIds()) {
            SyllabusTopic topic = byId.get(id);
            if (topic != null) {
                topic.setOrderIndex(index++);
            }
        }

        return topicRepository.saveAll(topics).stream()
                .sorted((a, b) -> Integer.compare(a.getOrderIndex(), b.getOrderIndex()))
                .map(SyllabusTopicResponse::from)
                .toList();
    }

    private List<SyllabusModuleResponse> reloadTree(Long courseId) {
        List<SyllabusModule> modules = moduleRepository.findAllByCourseIdOrderByOrderIndexAsc(courseId);
        List<Long> moduleIds = modules.stream().map(SyllabusModule::getId).toList();
        Map<Long, List<SyllabusTopicResponse>> topicsByModule = new HashMap<>();
        if (!moduleIds.isEmpty()) {
            topicRepository.findAllByModuleIdInOrderByOrderIndexAsc(moduleIds).forEach(topic ->
                    topicsByModule.computeIfAbsent(topic.getModule().getId(), k -> new java.util.ArrayList<>())
                            .add(SyllabusTopicResponse.from(topic)));
        }
        return modules.stream()
                .map(module -> SyllabusModuleResponse.from(module, topicsByModule.getOrDefault(module.getId(), List.of())))
                .toList();
    }

    private Course findCourseOrThrow(Long id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + id));
    }

    private SyllabusModule findModuleOrThrow(Long id) {
        return moduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Module not found: " + id));
    }

    private SyllabusTopic findTopicOrThrow(Long id) {
        return topicRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Topic not found: " + id));
    }
}
