package com.careerlabs.lms.api.recordedsession.service.impl;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.recordedsession.dto.request.CreateRecordedSessionRequest;
import com.careerlabs.lms.api.recordedsession.dto.request.UpdateRecordedSessionRequest;
import com.careerlabs.lms.api.recordedsession.dto.response.ProcessingStatusResponse;
import com.careerlabs.lms.api.recordedsession.dto.response.RecordedSessionAnalyticsResponse;
import com.careerlabs.lms.api.recordedsession.dto.response.RecordedSessionResponse;
import com.careerlabs.lms.api.recordedsession.dto.response.StudentRecordedSessionResponse;
import com.careerlabs.lms.api.recordedsession.entity.PlaybackSession;
import com.careerlabs.lms.api.recordedsession.entity.PlaybackSessionStatus;
import com.careerlabs.lms.api.recordedsession.entity.RecordedSession;
import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionStatus;
import com.careerlabs.lms.api.recordedsession.repository.PlaybackSessionRepository;
import com.careerlabs.lms.api.recordedsession.repository.RecordedSessionAssetRepository;
import com.careerlabs.lms.api.recordedsession.repository.RecordedSessionRepository;
import com.careerlabs.lms.api.recordedsession.service.GoogleDriveService;
import com.careerlabs.lms.api.recordedsession.service.RecordedSessionAvailabilityService;
import com.careerlabs.lms.api.recordedsession.service.RecordedSessionService;
import com.careerlabs.lms.api.recordedsession.service.VideoStorageService;
import com.careerlabs.lms.api.recordedsession.service.VideoTranscodingService;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class RecordedSessionServiceImpl implements RecordedSessionService {

    private static final Logger log = LoggerFactory.getLogger(RecordedSessionServiceImpl.class);

    private final RecordedSessionRepository recordedSessionRepository;
    private final RecordedSessionAssetRepository recordedSessionAssetRepository;
    private final PlaybackSessionRepository playbackSessionRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;
    private final VideoStorageService storageService;
    private final VideoTranscodingService transcodingService;
    private final RecordedSessionAvailabilityService availabilityService;
    private final GoogleDriveService googleDriveService;
    private final CourseAccessGuard accessGuard;

    public RecordedSessionServiceImpl(RecordedSessionRepository recordedSessionRepository,
                                       RecordedSessionAssetRepository recordedSessionAssetRepository,
                                       PlaybackSessionRepository playbackSessionRepository,
                                       CourseRepository courseRepository,
                                       EnrollmentRepository enrollmentRepository,
                                       StudentRepository studentRepository,
                                       VideoStorageService storageService,
                                       VideoTranscodingService transcodingService,
                                       RecordedSessionAvailabilityService availabilityService,
                                       GoogleDriveService googleDriveService,
                                       CourseAccessGuard accessGuard) {
        this.recordedSessionRepository = recordedSessionRepository;
        this.recordedSessionAssetRepository = recordedSessionAssetRepository;
        this.playbackSessionRepository = playbackSessionRepository;
        this.courseRepository = courseRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.studentRepository = studentRepository;
        this.storageService = storageService;
        this.transcodingService = transcodingService;
        this.availabilityService = availabilityService;
        this.googleDriveService = googleDriveService;
        this.accessGuard = accessGuard;
    }

    @Override
    @Transactional(readOnly = true)
    public List<RecordedSessionResponse> list() {
        return recordedSessionRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public RecordedSessionResponse get(Long id) {
        return toResponse(findOrThrow(id));
    }

    @Override
    @Transactional
    public RecordedSessionResponse create(CreateRecordedSessionRequest request, Long createdBy) {
        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + request.getCourseId()));

        RecordedSession session = new RecordedSession();
        session.setCreatedBy(createdBy);
        applyRequest(session, course, request.getBatchId(), request.getInstructorName(), request.getTitle(),
                request.getDescription(), request.getThumbnailUrl(), request.getTags(), request.getSessionDate(),
                request.getAvailableFrom(), request.getAvailableUntil());

        return toResponse(recordedSessionRepository.save(session));
    }

    @Override
    @Transactional
    public RecordedSessionResponse update(Long id, UpdateRecordedSessionRequest request) {
        RecordedSession session = findOrThrow(id);
        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + request.getCourseId()));

        applyRequest(session, course, request.getBatchId(), request.getInstructorName(), request.getTitle(),
                request.getDescription(), request.getThumbnailUrl(), request.getTags(), request.getSessionDate(),
                request.getAvailableFrom(), request.getAvailableUntil());

        return toResponse(recordedSessionRepository.save(session));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        RecordedSession session = findOrThrow(id);
        if (playbackSessionRepository.countByRecordedSessionId(id) > 0) {
            throw new ConflictException("Cannot delete a recorded session that already has playback history; archive it instead");
        }
        if (session.getDriveFileId() != null) {
            try {
                googleDriveService.deleteFile(session.getDriveFileId());
            } catch (Exception e) {
                log.warn("Could not delete Drive file {} for session {}: {}", session.getDriveFileId(), id, e.getMessage());
            }
        }
        recordedSessionAssetRepository.deleteByRecordedSessionId(id);
        storageService.deleteSessionAssets(id);
        recordedSessionRepository.delete(session);
    }

    @Override
    @Transactional
    public void uploadVideo(Long id, MultipartFile file) {
        RecordedSession session = findOrThrow(id);
        if (session.getStatus() == RecordedSessionStatus.PROCESSING) {
            throw new ConflictException("A video is already being processed for this session");
        }

        // 1. Prepare local source upload for transcoding & packaging
        Path sourceFile = storageService.storeSourceUpload(file, id);

        // 2. Upload video to Google Drive
        String driveFileId = googleDriveService.uploadFile(file, id);
        session.setDriveFileId(driveFileId);

        session.setStatus(RecordedSessionStatus.PROCESSING);
        session.setProcessingError(null);
        recordedSessionRepository.save(session);

        transcodingService.transcodeAsync(id, sourceFile);
    }

    @Override
    @Transactional(readOnly = true)
    public ProcessingStatusResponse getProcessingStatus(Long id) {
        RecordedSession session = findOrThrow(id);
        return new ProcessingStatusResponse(session.getStatus(), session.getProcessingError(), session.getDurationSeconds());
    }

    @Override
    @Transactional
    public RecordedSessionResponse publish(Long id) {
        RecordedSession session = findOrThrow(id);
        if (session.getStatus() != RecordedSessionStatus.READY && session.getStatus() != RecordedSessionStatus.PUBLISHED) {
            throw new BadRequestException("Only a READY session can be published — this one is " + session.getStatus());
        }
        session.setStatus(RecordedSessionStatus.PUBLISHED);
        return toResponse(recordedSessionRepository.save(session));
    }

    @Override
    @Transactional
    public RecordedSessionResponse archive(Long id) {
        RecordedSession session = findOrThrow(id);
        session.setStatus(RecordedSessionStatus.ARCHIVED);
        return toResponse(recordedSessionRepository.save(session));
    }

    @Override
    @Transactional(readOnly = true)
    public RecordedSessionAnalyticsResponse getAnalytics(Long id) {
        RecordedSession session = findOrThrow(id);
        long totalAssigned = enrollmentRepository.countByCourseId(session.getCourse().getId());
        long uniqueStarted = playbackSessionRepository.countDistinctStudentsByRecordedSessionId(id);
        long completed = playbackSessionRepository.countByRecordedSessionIdAndCompletionPercentageGreaterThanEqual(id, 90);
        long currentlyWatching = playbackSessionRepository.countByRecordedSessionIdAndStatus(id, PlaybackSessionStatus.ACTIVE);

        List<PlaybackSession> all = playbackSessionRepository.findByRecordedSessionId(id);
        double averageWatch = all.stream().mapToInt(PlaybackSession::getWatchDurationSeconds).average().orElse(0);
        double completionRate = uniqueStarted == 0 ? 0 : (completed * 100.0) / uniqueStarted;

        return new RecordedSessionAnalyticsResponse(totalAssigned, uniqueStarted, completed,
                Math.round(averageWatch * 10) / 10.0, Math.round(completionRate * 10) / 10.0, currentlyWatching);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentRecordedSessionResponse> listForStudent(Long studentUserId) {
        Student student = resolveStudent(studentUserId);
        return recordedSessionRepository.findByStatusOrderByCreatedAtDesc(RecordedSessionStatus.PUBLISHED).stream()
                .filter(session -> session.getCourse() != null
                        && accessGuard.isReadableCourseStatus(session.getCourse().getStatus()))
                .filter(session -> enrollmentRepository.existsByStudentIdAndCourseId(student.getId(), session.getCourse().getId()))
                .map(session -> toStudentResponse(session, studentUserId))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public StudentRecordedSessionResponse getForStudent(Long id, Long studentUserId) {
        Student student = resolveStudent(studentUserId);
        RecordedSession session = findOrThrow(id);
        if (session.getStatus() != RecordedSessionStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Recorded session not found: " + id);
        }
        if (session.getCourse() == null || !accessGuard.isReadableCourseStatus(session.getCourse().getStatus())) {
            throw new ForbiddenException("This course is not currently available");
        }
        if (!enrollmentRepository.existsByStudentIdAndCourseId(student.getId(), session.getCourse().getId())) {
            throw new ResourceNotFoundException("Recorded session not found: " + id);
        }
        return toStudentResponse(session, studentUserId);
    }

    private Student resolveStudent(Long userId) {
        return studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for user: " + userId));
    }

    private RecordedSession findOrThrow(Long id) {
        return recordedSessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recorded session not found: " + id));
    }

    private void applyRequest(RecordedSession session, Course course, Long batchId, String instructorName,
                               String title, String description, String thumbnailUrl, String tags,
                               java.time.LocalDate sessionDate, LocalDateTime availableFrom, LocalDateTime availableUntil) {
        if (availableFrom != null && availableUntil != null && !availableFrom.isBefore(availableUntil)) {
            throw new BadRequestException("Available-from must be before available-until");
        }
        session.setCourse(course);
        session.setBatchId(batchId);
        session.setInstructorName(instructorName);
        session.setTitle(title);
        session.setDescription(description);
        session.setThumbnailUrl(thumbnailUrl);
        session.setTags(tags);
        session.setSessionDate(sessionDate);
        session.setAvailableFrom(availableFrom);
        session.setAvailableUntil(availableUntil);
    }

    private RecordedSessionResponse toResponse(RecordedSession session) {
        return RecordedSessionResponse.from(session, session.getCourse().getTitle(), availabilityService.effectiveStatus(session));
    }

    private StudentRecordedSessionResponse toStudentResponse(RecordedSession session, Long studentUserId) {
        int watchedPercentage = 0;
        int resumePositionSeconds = 0;
        var latest = playbackSessionRepository.findFirstByStudentIdAndRecordedSessionIdOrderByStartedAtDesc(studentUserId, session.getId());
        if (latest.isPresent()) {
            watchedPercentage = latest.get().getCompletionPercentage();
            resumePositionSeconds = latest.get().getLastPositionSeconds();
        }
        return StudentRecordedSessionResponse.from(session, session.getCourse().getTitle(), availabilityService.effectiveStatus(session),
                watchedPercentage, resumePositionSeconds);
    }
}
