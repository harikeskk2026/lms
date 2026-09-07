package com.careerlabs.lms.api.session.service.impl;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.material.dto.response.MaterialResponse;
import com.careerlabs.lms.api.material.entity.Material;
import com.careerlabs.lms.api.material.entity.MaterialVisibility;
import com.careerlabs.lms.api.material.repository.MaterialRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.common.dto.request.ReorderRequest;
import com.careerlabs.lms.api.session.dto.request.SessionRequest;
import com.careerlabs.lms.api.session.dto.response.SessionResponse;
import com.careerlabs.lms.api.session.entity.Session;
import com.careerlabs.lms.api.session.repository.SessionRepository;
import com.careerlabs.lms.api.session.service.SessionService;
import com.careerlabs.lms.api.syllabus.entity.SyllabusTopic;
import com.careerlabs.lms.api.syllabus.repository.SyllabusTopicRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SessionServiceImpl implements SessionService {

    private final SessionRepository sessionRepository;
    private final SyllabusTopicRepository topicRepository;
    private final MaterialRepository materialRepository;
    private final CourseAccessGuard accessGuard;

    public SessionServiceImpl(SessionRepository sessionRepository, SyllabusTopicRepository topicRepository,
                               MaterialRepository materialRepository, CourseAccessGuard accessGuard) {
        this.sessionRepository = sessionRepository;
        this.topicRepository = topicRepository;
        this.materialRepository = materialRepository;
        this.accessGuard = accessGuard;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SessionResponse> list(Long topicId, JwtUserPrincipal principal) {
        SyllabusTopic topic = findTopicOrThrow(topicId);
        accessGuard.requireContentAccess(principal, topic.getModule().getCourse().getId());

        List<Session> sessions = sessionRepository.findAllByTopicIdOrderByOrderIndexAsc(topicId);
        if (!accessGuard.isAdmin(principal)) {
            sessions = sessions.stream().filter(this::isPublished).toList();
        }

        List<Long> sessionIds = sessions.stream().map(Session::getId).toList();
        Map<Long, List<MaterialResponse>> materialsBySession = new HashMap<>();
        if (!sessionIds.isEmpty()) {
            materialRepository.findAllBySessionIdInOrderByOrderIndexAsc(sessionIds).forEach(m -> {
                if (accessGuard.isAdmin(principal) || isMaterialPublished(m)) {
                    materialsBySession.computeIfAbsent(m.getSessionId(), k -> new ArrayList<>())
                            .add(MaterialResponse.from(m));
                }
            });
        }

        return sessions.stream()
                .map(session -> SessionResponse.from(session, materialsBySession.getOrDefault(session.getId(), List.of())))
                .toList();
    }

    private boolean isPublished(Session session) {
        return session.getStatus() == null || session.getStatus() == CourseStatus.PUBLISHED;
    }

    private boolean isMaterialPublished(Material material) {
        return material.getVisibility() == null || material.getVisibility() == MaterialVisibility.PUBLISHED;
    }

    @Override
    @Transactional
    public SessionResponse create(Long topicId, SessionRequest request) {
        SyllabusTopic topic = findTopicOrThrow(topicId);

        Session session = new Session();
        session.setTopic(topic);
        applyRequest(session, request);
        session.setOrderIndex(sessionRepository.countByTopicId(topicId));

        return SessionResponse.from(sessionRepository.save(session));
    }

    @Override
    @Transactional
    public SessionResponse update(Long id, SessionRequest request) {
        Session session = findOrThrow(id);
        applyRequest(session, request);
        return SessionResponse.from(sessionRepository.save(session));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Session session = findOrThrow(id);
        materialRepository.deleteAllBySessionIdIn(List.of(id));
        sessionRepository.delete(session);
    }

    @Override
    @Transactional
    public List<SessionResponse> reorder(Long topicId, ReorderRequest request) {
        findTopicOrThrow(topicId);
        List<Session> sessions = sessionRepository.findAllByTopicIdOrderByOrderIndexAsc(topicId);
        Map<Long, Session> byId = new HashMap<>();
        sessions.forEach(s -> byId.put(s.getId(), s));

        int index = 0;
        for (Long id : request.getOrderedIds()) {
            Session session = byId.get(id);
            if (session != null) {
                session.setOrderIndex(index++);
            }
        }

        return sessionRepository.saveAll(sessions).stream()
                .sorted((a, b) -> Integer.compare(a.getOrderIndex(), b.getOrderIndex()))
                .map(SessionResponse::from)
                .toList();
    }

    private Session findOrThrow(Long id) {
        return sessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + id));
    }

    private SyllabusTopic findTopicOrThrow(Long topicId) {
        return topicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic not found: " + topicId));
    }

    private void applyRequest(Session session, SessionRequest request) {
        if (request.getStartTime() != null && request.getEndTime() != null
                && !request.getEndTime().isAfter(request.getStartTime())) {
            throw new BadRequestException("End time must be after start time");
        }

        session.setTitle(request.getTitle());
        session.setDescription(request.getDescription());
        session.setTrainerName(request.getTrainerName());
        session.setSessionDate(request.getSessionDate());
        session.setStartTime(request.getStartTime());
        session.setEndTime(request.getEndTime());
        session.setDurationMinutes(request.getDurationMinutes());
        session.setType(request.getType());
        session.setMeetingUrl(request.getMeetingUrl());
        session.setRecordingUrl(request.getRecordingUrl());
        session.setStatus(request.getStatus());
    }
}
