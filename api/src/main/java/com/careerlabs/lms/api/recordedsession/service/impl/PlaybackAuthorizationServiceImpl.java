package com.careerlabs.lms.api.recordedsession.service.impl;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.recordedsession.dto.request.PlaybackStartRequest;
import com.careerlabs.lms.api.recordedsession.dto.response.AuditLogResponse;
import com.careerlabs.lms.api.recordedsession.dto.response.BlockedStudentResponse;
import com.careerlabs.lms.api.recordedsession.dto.response.PlaybackSessionAdminResponse;
import com.careerlabs.lms.api.recordedsession.dto.response.PlaybackStartResponse;
import com.careerlabs.lms.api.recordedsession.entity.PlaybackEvent;
import com.careerlabs.lms.api.recordedsession.entity.PlaybackEventType;
import com.careerlabs.lms.api.recordedsession.entity.PlaybackSession;
import com.careerlabs.lms.api.recordedsession.entity.PlaybackSessionStatus;
import com.careerlabs.lms.api.recordedsession.entity.RecordedSession;
import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionAccessBlock;
import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionAuditLog;
import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionEffectiveStatus;
import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionStatus;
import com.careerlabs.lms.api.recordedsession.repository.PlaybackEventRepository;
import com.careerlabs.lms.api.recordedsession.repository.PlaybackSessionRepository;
import com.careerlabs.lms.api.recordedsession.repository.RecordedSessionAccessBlockRepository;
import com.careerlabs.lms.api.recordedsession.repository.RecordedSessionAssetRepository;
import com.careerlabs.lms.api.recordedsession.repository.RecordedSessionAuditLogRepository;
import com.careerlabs.lms.api.recordedsession.repository.RecordedSessionRepository;
import com.careerlabs.lms.api.recordedsession.security.PlaybackTokenService;
import com.careerlabs.lms.api.recordedsession.service.PlaybackAuthorizationService;
import com.careerlabs.lms.api.recordedsession.service.RecordedSessionAvailabilityService;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
public class PlaybackAuthorizationServiceImpl implements PlaybackAuthorizationService {

    /** A stale heartbeat gap (background tab, dropped connection) never counts as watch time beyond this. */
    private static final int MAX_HEARTBEAT_GAP_SECONDS = 20;
    private static final int COMPLETION_THRESHOLD_PERCENT = 90;

    /** Low-severity, client-reportable signals — none of these prove an actual capture happened. */
    private static final Set<PlaybackEventType> CLIENT_REPORTABLE_EVENT_TYPES = EnumSet.of(
            PlaybackEventType.TAB_HIDDEN, PlaybackEventType.WINDOW_BLURRED,
            PlaybackEventType.FULLSCREEN_EXITED, PlaybackEventType.FULLSCREEN_ENTERED);

    private final RecordedSessionRepository recordedSessionRepository;
    private final RecordedSessionAssetRepository recordedSessionAssetRepository;
    private final PlaybackSessionRepository playbackSessionRepository;
    private final PlaybackEventRepository playbackEventRepository;
    private final RecordedSessionAuditLogRepository auditLogRepository;
    private final RecordedSessionAccessBlockRepository accessBlockRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final RecordedSessionAvailabilityService availabilityService;
    private final PlaybackTokenService playbackTokenService;
    private final CourseAccessGuard accessGuard;

    public PlaybackAuthorizationServiceImpl(RecordedSessionRepository recordedSessionRepository,
                                             RecordedSessionAssetRepository recordedSessionAssetRepository,
                                             PlaybackSessionRepository playbackSessionRepository,
                                             PlaybackEventRepository playbackEventRepository,
                                             RecordedSessionAuditLogRepository auditLogRepository,
                                             RecordedSessionAccessBlockRepository accessBlockRepository,
                                             EnrollmentRepository enrollmentRepository,
                                             StudentRepository studentRepository,
                                             UserRepository userRepository,
                                             RecordedSessionAvailabilityService availabilityService,
                                             PlaybackTokenService playbackTokenService,
                                             CourseAccessGuard accessGuard) {
        this.recordedSessionRepository = recordedSessionRepository;
        this.recordedSessionAssetRepository = recordedSessionAssetRepository;
        this.playbackSessionRepository = playbackSessionRepository;
        this.playbackEventRepository = playbackEventRepository;
        this.auditLogRepository = auditLogRepository;
        this.accessBlockRepository = accessBlockRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.availabilityService = availabilityService;
        this.playbackTokenService = playbackTokenService;
        this.accessGuard = accessGuard;
    }

    @Override
    @Transactional
    public PlaybackStartResponse startPlayback(Long studentUserId, Long recordedSessionId, PlaybackStartRequest request,
                                                String ipAddress, String userAgent) {
        String deviceId = request.getDeviceId();
        Student student = studentRepository.findByUserId(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for user: " + studentUserId));

        RecordedSession session = recordedSessionRepository.findById(recordedSessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Recorded session not found: " + recordedSessionId));

        if (!enrollmentRepository.existsByStudentIdAndCourseId(student.getId(), session.getCourse().getId())) {
            audit(studentUserId, recordedSessionId, deviceId, ipAddress, "PLAYBACK_DENIED", "NOT_ENROLLED");
            throw new ForbiddenException("You are not enrolled in this course");
        }
        if (session.getCourse() == null || !accessGuard.isReadableCourseStatus(session.getCourse().getStatus())) {
            audit(studentUserId, recordedSessionId, deviceId, ipAddress, "PLAYBACK_DENIED", "COURSE_NOT_AVAILABLE");
            throw new ForbiddenException("This course is not currently available");
        }
        if (accessBlockRepository.existsByRecordedSessionIdAndStudentUserId(recordedSessionId, studentUserId)) {
            audit(studentUserId, recordedSessionId, deviceId, ipAddress, "PLAYBACK_DENIED", "BLOCKED_BY_ADMIN");
            throw new ForbiddenException("Access to this recording has been blocked by an administrator");
        }
        if (session.getStatus() != RecordedSessionStatus.PUBLISHED) {
            audit(studentUserId, recordedSessionId, deviceId, ipAddress, "PLAYBACK_DENIED", "NOT_PUBLISHED");
            throw new ResourceNotFoundException("Recorded session not found: " + recordedSessionId);
        }

        RecordedSessionEffectiveStatus effectiveStatus = availabilityService.effectiveStatus(session);
        if (effectiveStatus == RecordedSessionEffectiveStatus.SCHEDULED) {
            audit(studentUserId, recordedSessionId, deviceId, ipAddress, "PLAYBACK_DENIED", "NOT_YET_AVAILABLE");
            throw new ConflictException("This session isn't available yet");
        }
        if (effectiveStatus == RecordedSessionEffectiveStatus.EXPIRED) {
            audit(studentUserId, recordedSessionId, deviceId, ipAddress, "PLAYBACK_DENIED", "AVAILABILITY_EXPIRED");
            throw new ConflictException("This session is no longer available");
        }

        if (recordedSessionAssetRepository.findByRecordedSessionId(recordedSessionId).isEmpty()) {
            audit(studentUserId, recordedSessionId, deviceId, ipAddress, "PLAYBACK_DENIED", "VIDEO_NOT_READY");
            throw new ConflictException("This session's video isn't ready yet");
        }

        enforceConcurrency(studentUserId, recordedSessionId, deviceId, request.isForceTakeover(), ipAddress);

        PlaybackSession playbackSession = findOrCreateActiveSession(studentUserId, recordedSessionId, deviceId, session, ipAddress, userAgent);
        playbackSession.setLastActivity(Instant.now());
        playbackSession.setStatus(PlaybackSessionStatus.ACTIVE);
        playbackSession = playbackSessionRepository.save(playbackSession);

        String token = playbackTokenService.generateToken(studentUserId, recordedSessionId, deviceId);
        String manifestUrl = "/api/student/recorded-sessions/" + recordedSessionId + "/stream/manifest.m3u8?token=" + token;

        audit(studentUserId, recordedSessionId, deviceId, ipAddress, "PLAYBACK_STARTED", "ALLOWED");

        return new PlaybackStartResponse(playbackSession.getId(), token, playbackTokenService.getExpirationSeconds(),
                manifestUrl, playbackSession.getLastPositionSeconds());
    }

    /**
     * A past race between two near-simultaneous start requests could have left
     * more than one ACTIVE row for this exact (student, recording, device) —
     * reuse the most recently started one and heal the rest by revoking them,
     * rather than letting a non-unique lookup blow up the request.
     */
    private PlaybackSession findOrCreateActiveSession(Long studentUserId, Long recordedSessionId, String deviceId,
                                                        RecordedSession session, String ipAddress, String userAgent) {
        List<PlaybackSession> existingActive = playbackSessionRepository
                .findByStudentIdAndRecordedSessionIdAndDeviceIdAndStatus(studentUserId, recordedSessionId, deviceId, PlaybackSessionStatus.ACTIVE);

        if (existingActive.isEmpty()) {
            PlaybackSession created = new PlaybackSession();
            created.setStudentId(studentUserId);
            created.setRecordedSession(session);
            created.setDeviceId(deviceId);
            created.setIpAddress(ipAddress);
            created.setUserAgent(userAgent);
            seedResumePosition(created, studentUserId, recordedSessionId);
            return created;
        }

        existingActive.sort(Comparator.comparing(PlaybackSession::getStartedAt).reversed());
        for (int i = 1; i < existingActive.size(); i++) {
            PlaybackSession duplicate = existingActive.get(i);
            duplicate.setStatus(PlaybackSessionStatus.REVOKED);
            duplicate.setEndedAt(Instant.now());
            playbackSessionRepository.save(duplicate);
        }
        return existingActive.get(0);
    }

    private void seedResumePosition(PlaybackSession created, Long studentUserId, Long recordedSessionId) {
        playbackSessionRepository.findFirstByStudentIdAndRecordedSessionIdOrderByStartedAtDesc(studentUserId, recordedSessionId)
                .ifPresent(previous -> {
                    created.setLastPositionSeconds(previous.getLastPositionSeconds());
                    created.setCompletionPercentage(previous.getCompletionPercentage());
                });
    }

    private void enforceConcurrency(Long studentUserId, Long recordedSessionId, String deviceId, boolean forceTakeover, String ipAddress) {
        List<PlaybackSession> active = playbackSessionRepository.findByStudentIdAndStatus(studentUserId, PlaybackSessionStatus.ACTIVE);
        List<PlaybackSession> conflicting = active.stream()
                .filter(s -> !(s.getDeviceId().equals(deviceId) && s.getRecordedSession().getId().equals(recordedSessionId)))
                .toList();

        if (conflicting.isEmpty()) {
            return;
        }
        if (!forceTakeover) {
            audit(studentUserId, recordedSessionId, deviceId, ipAddress, "PLAYBACK_DENIED", "DEVICE_CONFLICT");
            throw new ConflictException("This account is already playing a recorded session on another device");
        }
        for (PlaybackSession other : conflicting) {
            other.setStatus(PlaybackSessionStatus.REVOKED);
            other.setEndedAt(Instant.now());
            playbackSessionRepository.save(other);
            audit(studentUserId, other.getRecordedSession().getId(), other.getDeviceId(), other.getIpAddress(),
                    "SESSION_REVOKED", "TAKEOVER_BY_OTHER_DEVICE");
        }
    }

    @Override
    @Transactional
    public void heartbeat(Long playbackSessionId, Long studentUserId, int positionSeconds) {
        PlaybackSession session = findOwnedSession(playbackSessionId, studentUserId);
        if (session.getStatus() != PlaybackSessionStatus.ACTIVE) {
            return;
        }

        Instant now = Instant.now();
        long gapSeconds = Math.max(0, now.getEpochSecond() - session.getLastActivity().getEpochSecond());
        session.setWatchDurationSeconds(session.getWatchDurationSeconds() + (int) Math.min(gapSeconds, MAX_HEARTBEAT_GAP_SECONDS));
        session.setLastPositionSeconds(Math.max(session.getLastPositionSeconds(), positionSeconds));
        session.setLastActivity(now);

        Integer durationSeconds = session.getRecordedSession().getDurationSeconds();
        if (durationSeconds != null && durationSeconds > 0) {
            int computed = (int) Math.min(100, Math.round(positionSeconds * 100.0 / durationSeconds));
            session.setCompletionPercentage(Math.max(session.getCompletionPercentage(), computed));
            if (session.getCompletionPercentage() >= COMPLETION_THRESHOLD_PERCENT) {
                session.setStatus(PlaybackSessionStatus.COMPLETED);
                session.setEndedAt(now);
            }
        }

        playbackSessionRepository.save(session);
    }

    @Override
    @Transactional
    public void end(Long playbackSessionId, Long studentUserId) {
        PlaybackSession session = findOwnedSession(playbackSessionId, studentUserId);
        if (session.getStatus() == PlaybackSessionStatus.ACTIVE) {
            session.setStatus(PlaybackSessionStatus.COMPLETED);
            session.setEndedAt(Instant.now());
            playbackSessionRepository.save(session);
        }
    }

    @Override
    @Transactional
    public void recordCaptureAttempt(Long playbackSessionId, Long studentUserId, Integer positionSeconds) {
        PlaybackSession session = findOwnedSession(playbackSessionId, studentUserId);

        PlaybackEvent event = new PlaybackEvent();
        event.setPlaybackSession(session);
        event.setEventType(PlaybackEventType.CAPTURE_ATTEMPT_DETECTED);
        event.setPositionSeconds(positionSeconds);
        playbackEventRepository.save(event);

        audit(studentUserId, session.getRecordedSession().getId(), session.getDeviceId(), session.getIpAddress(),
                "CAPTURE_ATTEMPT_DETECTED", "LOGGED_ONLY_NOT_BLOCKED");
    }

    @Override
    @Transactional
    public void recordClientEvent(Long playbackSessionId, Long studentUserId, PlaybackEventType eventType, Integer positionSeconds) {
        if (!CLIENT_REPORTABLE_EVENT_TYPES.contains(eventType)) {
            throw new BadRequestException("Event type is not client-reportable: " + eventType);
        }
        PlaybackSession session = findOwnedSession(playbackSessionId, studentUserId);

        PlaybackEvent event = new PlaybackEvent();
        event.setPlaybackSession(session);
        event.setEventType(eventType);
        event.setPositionSeconds(positionSeconds);
        playbackEventRepository.save(event);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PlaybackSessionAdminResponse> listPlaybackSessions(Long recordedSessionId) {
        return playbackSessionRepository.findByRecordedSessionIdOrderByStartedAtDesc(recordedSessionId).stream()
                .map(session -> {
                    User user = userRepository.findById(session.getStudentId()).orElse(null);
                    return PlaybackSessionAdminResponse.from(session,
                            user != null ? user.getName() : null,
                            user != null ? user.getEmail() : null);
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLogResponse> listAuditLog(Long recordedSessionId) {
        return auditLogRepository.findByRecordedSessionIdOrderByCreatedAtDesc(recordedSessionId).stream()
                .map(log -> {
                    User user = log.getStudentId() != null ? userRepository.findById(log.getStudentId()).orElse(null) : null;
                    return AuditLogResponse.from(log,
                            user != null ? user.getName() : null,
                            user != null ? user.getEmail() : null);
                })
                .toList();
    }

    @Override
    @Transactional
    public void revokeSession(Long playbackSessionId) {
        PlaybackSession session = playbackSessionRepository.findById(playbackSessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Playback session not found: " + playbackSessionId));
        if (session.getStatus() == PlaybackSessionStatus.ACTIVE) {
            session.setStatus(PlaybackSessionStatus.REVOKED);
            session.setEndedAt(Instant.now());
            playbackSessionRepository.save(session);
            audit(session.getStudentId(), session.getRecordedSession().getId(), session.getDeviceId(), session.getIpAddress(),
                    "SESSION_REVOKED", "REVOKED_BY_ADMIN");
        }
    }

    @Override
    @Transactional
    public void revokeAllForStudent(Long studentUserId) {
        List<PlaybackSession> active = playbackSessionRepository.findByStudentIdAndStatus(studentUserId, PlaybackSessionStatus.ACTIVE);
        for (PlaybackSession session : active) {
            session.setStatus(PlaybackSessionStatus.REVOKED);
            session.setEndedAt(Instant.now());
            playbackSessionRepository.save(session);
            audit(studentUserId, session.getRecordedSession().getId(), session.getDeviceId(), session.getIpAddress(),
                    "SESSION_REVOKED", "REVOKED_BY_ADMIN");
        }
    }

    @Override
    @Transactional
    public void blockStudent(Long recordedSessionId, Long studentUserId, Long blockedByAdminUserId) {
        if (!accessBlockRepository.existsByRecordedSessionIdAndStudentUserId(recordedSessionId, studentUserId)) {
            RecordedSessionAccessBlock block = new RecordedSessionAccessBlock();
            block.setRecordedSessionId(recordedSessionId);
            block.setStudentUserId(studentUserId);
            block.setBlockedBy(blockedByAdminUserId);
            accessBlockRepository.save(block);
        }

        playbackSessionRepository.findByStudentIdAndStatus(studentUserId, PlaybackSessionStatus.ACTIVE).stream()
                .filter(s -> s.getRecordedSession().getId().equals(recordedSessionId))
                .forEach(session -> {
                    session.setStatus(PlaybackSessionStatus.REVOKED);
                    session.setEndedAt(Instant.now());
                    playbackSessionRepository.save(session);
                });
        audit(studentUserId, recordedSessionId, null, null, "STUDENT_BLOCKED", "BLOCKED_BY_ADMIN");
    }

    @Override
    @Transactional
    public void unblockStudent(Long recordedSessionId, Long studentUserId) {
        accessBlockRepository.findByRecordedSessionIdAndStudentUserId(recordedSessionId, studentUserId)
                .ifPresent(accessBlockRepository::delete);
        audit(studentUserId, recordedSessionId, null, null, "STUDENT_UNBLOCKED", "ALLOWED");
    }

    @Override
    @Transactional(readOnly = true)
    public List<BlockedStudentResponse> listBlockedStudents(Long recordedSessionId) {
        return accessBlockRepository.findByRecordedSessionId(recordedSessionId).stream()
                .map(block -> {
                    User user = userRepository.findById(block.getStudentUserId()).orElse(null);
                    return BlockedStudentResponse.from(block,
                            user != null ? user.getName() : null,
                            user != null ? user.getEmail() : null);
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PlaybackSession requireActiveSession(Long studentUserId, Long recordedSessionId, String deviceId) {
        List<PlaybackSession> active = playbackSessionRepository
                .findByStudentIdAndRecordedSessionIdAndDeviceIdAndStatus(studentUserId, recordedSessionId, deviceId, PlaybackSessionStatus.ACTIVE);
        if (active.isEmpty()) {
            audit(studentUserId, recordedSessionId, deviceId, null, "PLAYBACK_DENIED", "SESSION_NOT_ACTIVE");
            throw new ForbiddenException("This playback session is no longer active");
        }
        // A leftover duplicate ACTIVE row (see findOrCreateActiveSession) is healed on the
        // next startPlayback call — until then, the most recently started row wins here.
        return active.stream().max(Comparator.comparing(PlaybackSession::getStartedAt)).orElseThrow();
    }

    private PlaybackSession findOwnedSession(Long playbackSessionId, Long studentUserId) {
        PlaybackSession session = playbackSessionRepository.findById(playbackSessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Playback session not found: " + playbackSessionId));
        if (!session.getStudentId().equals(studentUserId)) {
            throw new ForbiddenException("This playback session does not belong to you");
        }
        return session;
    }

    private void audit(Long studentId, Long recordedSessionId, String deviceId, String ipAddress, String action, String result) {
        RecordedSessionAuditLog log = new RecordedSessionAuditLog();
        log.setStudentId(studentId);
        log.setRecordedSessionId(recordedSessionId);
        log.setDeviceId(deviceId);
        log.setIpAddress(ipAddress);
        log.setAction(action);
        log.setResult(result);
        auditLogRepository.save(log);
    }
}
