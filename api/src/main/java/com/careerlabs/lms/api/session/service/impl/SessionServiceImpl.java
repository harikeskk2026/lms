package com.careerlabs.lms.api.session.service.impl;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.session.dto.request.ReorderRequest;
import com.careerlabs.lms.api.session.dto.request.SessionRequest;
import com.careerlabs.lms.api.session.dto.response.SessionResponse;
import com.careerlabs.lms.api.session.entity.Session;
import com.careerlabs.lms.api.session.repository.SessionRepository;
import com.careerlabs.lms.api.session.service.SessionService;
import com.careerlabs.lms.api.syllabus.entity.SyllabusTopic;
import com.careerlabs.lms.api.syllabus.repository.SyllabusTopicRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SessionServiceImpl implements SessionService {

    private final SessionRepository sessionRepository;
    private final SyllabusTopicRepository topicRepository;
    private final CourseAccessGuard accessGuard;

    public SessionServiceImpl(SessionRepository sessionRepository, SyllabusTopicRepository topicRepository,
                               CourseAccessGuard accessGuard) {
        this.sessionRepository = sessionRepository;
        this.topicRepository = topicRepository;
        this.accessGuard = accessGuard;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SessionResponse> list(Long topicId, JwtUserPrincipal principal) {
        SyllabusTopic topic = findTopicOrThrow(topicId);
        accessGuard.requireContentAccess(principal, topic.getModule().getCourse().getId());

        return sessionRepository.findAllByTopicIdOrderByOrderIndexAsc(topicId).stream()
                .map(SessionResponse::from)
                .toList();
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
        sessionRepository.delete(findOrThrow(id));
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
        session.setTitle(request.getTitle());
        session.setDescription(request.getDescription());
        session.setTrainerName(request.getTrainerName());
        session.setSessionDate(request.getSessionDate());
        session.setSessionTime(request.getSessionTime());
        session.setDurationMinutes(request.getDurationMinutes());
        session.setMeetingUrl(request.getMeetingUrl());
        session.setRecordingUrl(request.getRecordingUrl());
    }
}
