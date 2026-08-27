package com.careerlabs.lms.api.material.service.impl;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.storage.FileStorageService;
import com.careerlabs.lms.api.common.storage.StoredFile;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.material.dto.request.MaterialRequest;
import com.careerlabs.lms.api.material.dto.response.MaterialResponse;
import com.careerlabs.lms.api.material.dto.response.UploadResponse;
import com.careerlabs.lms.api.material.entity.Material;
import com.careerlabs.lms.api.material.repository.MaterialRepository;
import com.careerlabs.lms.api.material.service.MaterialService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.session.entity.Session;
import com.careerlabs.lms.api.session.repository.SessionRepository;
import com.careerlabs.lms.api.common.dto.request.ReorderRequest;
import com.careerlabs.lms.api.syllabus.entity.SyllabusModule;
import com.careerlabs.lms.api.syllabus.entity.SyllabusTopic;
import com.careerlabs.lms.api.syllabus.repository.SyllabusModuleRepository;
import com.careerlabs.lms.api.syllabus.repository.SyllabusTopicRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Stream;

@Service
public class MaterialServiceImpl implements MaterialService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "doc", "docx", "ppt", "pptx", "mp4", "mov", "webm");

    private final MaterialRepository materialRepository;
    private final CourseRepository courseRepository;
    private final SyllabusModuleRepository moduleRepository;
    private final SyllabusTopicRepository topicRepository;
    private final SessionRepository sessionRepository;
    private final CourseAccessGuard accessGuard;
    private final FileStorageService fileStorageService;

    public MaterialServiceImpl(MaterialRepository materialRepository, CourseRepository courseRepository,
                                SyllabusModuleRepository moduleRepository, SyllabusTopicRepository topicRepository,
                                SessionRepository sessionRepository, CourseAccessGuard accessGuard,
                                FileStorageService fileStorageService) {
        this.materialRepository = materialRepository;
        this.courseRepository = courseRepository;
        this.moduleRepository = moduleRepository;
        this.topicRepository = topicRepository;
        this.sessionRepository = sessionRepository;
        this.accessGuard = accessGuard;
        this.fileStorageService = fileStorageService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaterialResponse> list(Long courseId, Long moduleId, Long topicId, Long sessionId,
                                        JwtUserPrincipal principal) {
        long ownerCount = Stream.of(courseId, moduleId, topicId, sessionId).filter(Objects::nonNull).count();
        if (ownerCount != 1) {
            throw new BadRequestException("Exactly one of courseId, moduleId, topicId or sessionId is required");
        }

        Long resolvedCourseId;
        List<Material> materials;

        if (courseId != null) {
            resolvedCourseId = courseId;
            materials = materialRepository.findAllByCourseIdAndModuleIdIsNullAndTopicIdIsNullAndSessionIdIsNullOrderByOrderIndexAsc(courseId);
        } else if (moduleId != null) {
            SyllabusModule module = findModuleOrThrow(moduleId);
            resolvedCourseId = module.getCourse().getId();
            materials = materialRepository.findAllByModuleIdOrderByOrderIndexAsc(moduleId);
        } else if (topicId != null) {
            SyllabusTopic topic = findTopicOrThrow(topicId);
            resolvedCourseId = topic.getModule().getCourse().getId();
            materials = materialRepository.findAllByTopicIdOrderByOrderIndexAsc(topicId);
        } else {
            Session session = findSessionOrThrow(sessionId);
            resolvedCourseId = session.getTopic().getModule().getCourse().getId();
            materials = materialRepository.findAllBySessionIdOrderByOrderIndexAsc(sessionId);
        }

        accessGuard.requireContentAccess(principal, resolvedCourseId);

        if (!accessGuard.isAdmin(principal)) {
            materials = materials.stream().filter(this::isPublished).toList();
        }
        return materials.stream().map(MaterialResponse::from).toList();
    }

    private boolean isPublished(Material material) {
        return material.getVisibility() == null || material.getVisibility() == CourseStatus.PUBLISHED;
    }

    @Override
    @Transactional
    public MaterialResponse create(MaterialRequest request) {
        long ownerCount = Stream.of(request.getCourseId(), request.getModuleId(), request.getTopicId(), request.getSessionId())
                .filter(Objects::nonNull).count();
        if (ownerCount != 1) {
            throw new BadRequestException("Exactly one of courseId, moduleId, topicId or sessionId is required");
        }

        int nextOrder;
        if (request.getCourseId() != null) {
            findCourseOrThrow(request.getCourseId());
            nextOrder = materialRepository.countByCourseIdAndModuleIdIsNullAndTopicIdIsNullAndSessionIdIsNull(request.getCourseId());
        } else if (request.getModuleId() != null) {
            findModuleOrThrow(request.getModuleId());
            nextOrder = materialRepository.countByModuleId(request.getModuleId());
        } else if (request.getTopicId() != null) {
            findTopicOrThrow(request.getTopicId());
            nextOrder = materialRepository.countByTopicId(request.getTopicId());
        } else {
            findSessionOrThrow(request.getSessionId());
            nextOrder = materialRepository.countBySessionId(request.getSessionId());
        }

        Material material = new Material();
        applyRequest(material, request);
        material.setOrderIndex(nextOrder);

        return MaterialResponse.from(materialRepository.save(material));
    }

    @Override
    @Transactional
    public MaterialResponse update(Long id, MaterialRequest request) {
        Material material = findOrThrow(id);
        material.setTitle(request.getTitle());
        material.setType(request.getType());
        material.setUrl(request.getUrl());
        material.setDescription(request.getDescription());
        material.setVisibility(request.getVisibility());
        return MaterialResponse.from(materialRepository.save(material));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        materialRepository.delete(findOrThrow(id));
    }

    @Override
    @Transactional
    public List<MaterialResponse> reorder(ReorderRequest request) {
        List<Material> materials = materialRepository.findAllById(request.getOrderedIds());
        Map<Long, Material> byId = new HashMap<>();
        materials.forEach(m -> byId.put(m.getId(), m));

        int index = 0;
        for (Long id : request.getOrderedIds()) {
            Material material = byId.get(id);
            if (material != null) {
                material.setOrderIndex(index++);
            }
        }

        return materialRepository.saveAll(materials).stream()
                .sorted((a, b) -> Integer.compare(a.getOrderIndex(), b.getOrderIndex()))
                .map(MaterialResponse::from)
                .toList();
    }

    @Override
    public UploadResponse upload(MultipartFile file) {
        StoredFile stored = fileStorageService.store(file, "materials", ALLOWED_EXTENSIONS);
        return new UploadResponse(stored.url(), stored.originalName());
    }

    private void applyRequest(Material material, MaterialRequest request) {
        material.setTitle(request.getTitle());
        material.setType(request.getType());
        material.setUrl(request.getUrl());
        material.setDescription(request.getDescription());
        material.setVisibility(request.getVisibility());
        material.setCourseId(request.getCourseId());
        material.setModuleId(request.getModuleId());
        material.setTopicId(request.getTopicId());
        material.setSessionId(request.getSessionId());
    }

    private Material findOrThrow(Long id) {
        return materialRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found: " + id));
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

    private Session findSessionOrThrow(Long id) {
        return sessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + id));
    }
}
