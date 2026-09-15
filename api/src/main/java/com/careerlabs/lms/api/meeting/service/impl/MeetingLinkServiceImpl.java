package com.careerlabs.lms.api.meeting.service.impl;

import com.careerlabs.lms.api.attendance.entity.ClassStatus;
import com.careerlabs.lms.api.attendance.entity.DailyClass;
import com.careerlabs.lms.api.attendance.repository.AttendanceAuditLogRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceCorrectionRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.entity.BatchMode;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.batch.service.BatchAuthorizationGuard;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.meeting.dto.request.CreateMeetingLinkRequest;
import com.careerlabs.lms.api.meeting.dto.request.UpdateMeetingLinkRequest;
import com.careerlabs.lms.api.meeting.dto.response.MeetingLinkResponse;
import com.careerlabs.lms.api.meeting.entity.MeetingLink;
import com.careerlabs.lms.api.meeting.entity.MeetingPlatform;
import com.careerlabs.lms.api.meeting.entity.MeetingStatus;
import com.careerlabs.lms.api.meeting.repository.MeetingAttendeeRepository;
import com.careerlabs.lms.api.meeting.repository.MeetingLinkRepository;
import com.careerlabs.lms.api.meeting.service.MeetingLinkService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import org.springframework.util.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@Transactional
public class MeetingLinkServiceImpl implements MeetingLinkService {

    private final MeetingLinkRepository meetingLinkRepository;
    private final MeetingAttendeeRepository meetingAttendeeRepository;
    private final BatchRepository batchRepository;
    private final CourseRepository courseRepository;
    private final DailyClassRepository dailyClassRepository;
    private final AttendanceRepository attendanceRepository;
    private final AttendanceCorrectionRepository attendanceCorrectionRepository;
    private final AttendanceAuditLogRepository attendanceAuditLogRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final MeetingLinkSchedulerService schedulerService;
    private final BatchAuthorizationGuard batchAuthGuard;

    public MeetingLinkServiceImpl(
            MeetingLinkRepository meetingLinkRepository,
            MeetingAttendeeRepository meetingAttendeeRepository,
            BatchRepository batchRepository,
            CourseRepository courseRepository,
            DailyClassRepository dailyClassRepository,
            AttendanceRepository attendanceRepository,
            AttendanceCorrectionRepository attendanceCorrectionRepository,
            AttendanceAuditLogRepository attendanceAuditLogRepository,
            StudentRepository studentRepository,
            EnrollmentRepository enrollmentRepository,
            MeetingLinkSchedulerService schedulerService,
            BatchAuthorizationGuard batchAuthGuard
    ) {
        this.meetingLinkRepository = meetingLinkRepository;
        this.meetingAttendeeRepository = meetingAttendeeRepository;
        this.batchRepository = batchRepository;
        this.courseRepository = courseRepository;
        this.dailyClassRepository = dailyClassRepository;
        this.attendanceRepository = attendanceRepository;
        this.attendanceCorrectionRepository = attendanceCorrectionRepository;
        this.attendanceAuditLogRepository = attendanceAuditLogRepository;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.schedulerService = schedulerService;
        this.batchAuthGuard = batchAuthGuard;
    }

    @Override
    public MeetingLinkResponse createMeetingLink(CreateMeetingLinkRequest request, JwtUserPrincipal principal) {
        if (!StringUtils.hasText(request.getMeetUrl())) {
            throw new BadRequestException("Meeting URL is required");
        }
        if (request.getScheduledStart() != null && request.getScheduledEnd() != null) {
            if (!request.getScheduledEnd().isAfter(request.getScheduledStart())) {
                throw new BadRequestException("Scheduled end time must be after scheduled start time");
            }
        }

        // Duplicate meeting validation
        if (request.getScheduledStart() != null) {
            Long reqBatchId = request.getBatchId();
            Long reqCourseId = request.getCourseId();
            String reqTitle = request.getTitle() != null ? request.getTitle().trim() : "";
            String reqUrl = request.getMeetUrl().trim();
            LocalDateTime reqStart = request.getScheduledStart();

            List<MeetingLink> existingList;
            if (reqBatchId != null) {
                existingList = meetingLinkRepository.findByBatchIdOrderByScheduledStartDesc(reqBatchId);
            } else if (reqCourseId != null) {
                existingList = meetingLinkRepository.findByCourseIdOrderByScheduledStartDesc(reqCourseId);
            } else {
                existingList = meetingLinkRepository.findAll();
            }

            if (existingList != null) {
                boolean duplicate = existingList.stream().anyMatch(em -> {
                    if (em.getStatus() == MeetingStatus.CANCELLED) {
                        return false;
                    }
                    boolean sameStart = em.getScheduledStart() != null &&
                            (em.getScheduledStart().equals(reqStart) ||
                             Math.abs(java.time.Duration.between(em.getScheduledStart(), reqStart).toSeconds()) < 60);
                    boolean sameTitle = em.getTitle() != null && em.getTitle().trim().equalsIgnoreCase(reqTitle);
                    boolean sameUrl = em.getMeetUrl() != null && em.getMeetUrl().trim().equalsIgnoreCase(reqUrl);
                    return sameStart && (sameTitle || sameUrl);
                });

                if (duplicate) {
                    throw new BadRequestException("A scheduled class with this title/link at this scheduled time already exists.");
                }
            }
        }

        MeetingLink m = new MeetingLink();
        m.setTitle(request.getTitle());
        m.setDescription(request.getDescription());
        m.setMeetUrl(request.getMeetUrl());
        m.setPlatform(resolvePlatform(request.getMeetUrl(), request.getPlatform()));
        m.setHostName(request.getHostName());
        m.setScheduledStart(request.getScheduledStart());
        m.setScheduledEnd(request.getScheduledEnd());
        m.setPasscode(request.getPasscode());
        m.setStatus(MeetingStatus.SCHEDULED);
        m.setCreatedBy(principal != null ? principal.id() : null);

        if (request.getBatchId() != null) {
            Batch batch = batchAuthGuard.requireBatchOwnership(principal, request.getBatchId());
            if (batch.getMode() == BatchMode.OFFLINE) {
                throw new BadRequestException("Scheduled class meetings can only be created for ONLINE or HYBRID batches");
            }
            m.setBatch(batch);
            if (request.getCourseId() == null && batch.getCourse() != null) {
                m.setCourse(batch.getCourse());
            }
        }

        if (request.getCourseId() != null) {
            Course course = courseRepository.findById(request.getCourseId())
                    .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + request.getCourseId()));
            m.setCourse(course);
        }

        if (request.getDailyClassId() != null) {
            DailyClass dailyClass = dailyClassRepository.findById(request.getDailyClassId())
                    .orElseThrow(() -> new ResourceNotFoundException("DailyClass not found with id: " + request.getDailyClassId()));
            m.setDailyClass(dailyClass);
            if (dailyClass.getMeetLink() == null || dailyClass.getMeetLink().isBlank()) {
                dailyClass.setMeetLink(request.getMeetUrl());
            }
        } else if (m.getBatch() != null) {
            LocalDateTime start = m.getScheduledStart() != null ? m.getScheduledStart() : LocalDateTime.now();
            List<DailyClass> existingClasses = dailyClassRepository.findByBatchIdOrderByDateDesc(m.getBatch().getId());
            DailyClass dc = existingClasses != null ? existingClasses.stream()
                    .filter(c -> c.getStatus() != ClassStatus.CANCELLED &&
                            ((c.getDate() != null && Math.abs(java.time.Duration.between(c.getDate(), start).toMinutes()) < 15) ||
                             (c.getMeetLink() != null && c.getMeetLink().equalsIgnoreCase(m.getMeetUrl())) ||
                             (c.getTitle() != null && c.getTitle().trim().equalsIgnoreCase(m.getTitle().trim()) &&
                              c.getDate() != null && c.getDate().toLocalDate().equals(start.toLocalDate()))))
                    .findFirst()
                    .orElse(null) : null;

            if (dc == null) {
                dc = new DailyClass();
                dc.setBatch(m.getBatch());
                dc.setDate(start);
                dc.setTitle(m.getTitle());
                dc.setMeetLink(m.getMeetUrl());
                dc.setStatus(ClassStatus.SCHEDULED);
                dc = dailyClassRepository.save(dc);
            } else {
                if (dc.getMeetLink() == null || dc.getMeetLink().isBlank()) {
                    dc.setMeetLink(m.getMeetUrl());
                    dc = dailyClassRepository.save(dc);
                }
            }
            m.setDailyClass(dc);
        }

        MeetingLink saved = meetingLinkRepository.save(m);
        return toResponse(saved, principal);
    }

    @Override
    public MeetingLinkResponse updateMeetingLink(Long id, UpdateMeetingLinkRequest request, JwtUserPrincipal principal) {
        MeetingLink m = meetingLinkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting link not found with id: " + id));

        batchAuthGuard.requireEntityBatchOwnership(principal,
                m.getBatch() != null ? m.getBatch().getId() : null);

        LocalDateTime start = request.getScheduledStart() != null ? request.getScheduledStart() : m.getScheduledStart();
        LocalDateTime end = request.getScheduledEnd() != null ? request.getScheduledEnd() : m.getScheduledEnd();
        if (start != null && end != null && !end.isAfter(start)) {
            throw new BadRequestException("Scheduled end time must be after scheduled start time");
        }

        // Duplicate meeting validation on update
        if (start != null) {
            Long targetBatchId = request.getBatchId() != null ? request.getBatchId() : (m.getBatch() != null ? m.getBatch().getId() : null);
            Long targetCourseId = request.getCourseId() != null ? request.getCourseId() : (m.getCourse() != null ? m.getCourse().getId() : null);
            String targetTitle = request.getTitle() != null ? request.getTitle().trim() : (m.getTitle() != null ? m.getTitle().trim() : "");
            String targetUrl = request.getMeetUrl() != null ? request.getMeetUrl().trim() : (m.getMeetUrl() != null ? m.getMeetUrl().trim() : "");

            List<MeetingLink> existingList;
            if (targetBatchId != null) {
                existingList = meetingLinkRepository.findByBatchIdOrderByScheduledStartDesc(targetBatchId);
            } else if (targetCourseId != null) {
                existingList = meetingLinkRepository.findByCourseIdOrderByScheduledStartDesc(targetCourseId);
            } else {
                existingList = meetingLinkRepository.findAll();
            }

            if (existingList != null) {
                boolean duplicate = existingList.stream().anyMatch(em -> {
                    if (em.getId().equals(id) || em.getStatus() == MeetingStatus.CANCELLED) {
                        return false;
                    }
                    boolean sameStart = em.getScheduledStart() != null &&
                            (em.getScheduledStart().equals(start) ||
                             Math.abs(java.time.Duration.between(em.getScheduledStart(), start).toSeconds()) < 60);
                    boolean sameTitle = em.getTitle() != null && em.getTitle().trim().equalsIgnoreCase(targetTitle);
                    boolean sameUrl = em.getMeetUrl() != null && em.getMeetUrl().trim().equalsIgnoreCase(targetUrl);
                    return sameStart && (sameTitle || sameUrl);
                });

                if (duplicate) {
                    throw new BadRequestException("Another scheduled class with this title/link at this scheduled time already exists.");
                }
            }
        }

        if (request.getTitle() != null) m.setTitle(request.getTitle());
        if (request.getDescription() != null) m.setDescription(request.getDescription());
        if (request.getMeetUrl() != null) {
            m.setMeetUrl(request.getMeetUrl());
            m.setPlatform(resolvePlatform(request.getMeetUrl(), request.getPlatform()));
        } else if (request.getPlatform() != null) {
            m.setPlatform(request.getPlatform());
        }
        if (request.getHostName() != null) m.setHostName(request.getHostName());
        if (request.getScheduledStart() != null) m.setScheduledStart(request.getScheduledStart());
        if (request.getScheduledEnd() != null) m.setScheduledEnd(request.getScheduledEnd());
        if (request.getStatus() != null) m.setStatus(request.getStatus());
        if (request.getPasscode() != null) m.setPasscode(request.getPasscode());

        // The edit form always submits the full desired state (including a cleared
        // "All Batches"/"All Courses" selection as null), so these must always be
        // assigned — not skipped when null — or clearing them back to "All" would
        // silently do nothing and leave the previous batch/course in place.
        if (request.getBatchId() != null) {
            Batch batch = batchAuthGuard.requireBatchOwnership(principal, request.getBatchId());
            if (batch.getMode() == BatchMode.OFFLINE) {
                throw new BadRequestException("Scheduled class meetings can only be created for ONLINE or HYBRID batches");
            }
            m.setBatch(batch);
            if (request.getCourseId() == null && batch.getCourse() != null) {
                m.setCourse(batch.getCourse());
            }
        } else {
            m.setBatch(null);
        }

        if (request.getCourseId() != null) {
            Course course = courseRepository.findById(request.getCourseId())
                    .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + request.getCourseId()));
            m.setCourse(course);
        } else if (request.getBatchId() == null) {
            m.setCourse(null);
        }

        if (request.getDailyClassId() != null) {
            DailyClass dailyClass = dailyClassRepository.findById(request.getDailyClassId())
                    .orElseThrow(() -> new ResourceNotFoundException("DailyClass not found with id: " + request.getDailyClassId()));
            m.setDailyClass(dailyClass);
        } else if (m.getBatch() != null) {
            DailyClass dc = m.getDailyClass();
            if (dc == null) {
                LocalDateTime startDt = m.getScheduledStart() != null ? m.getScheduledStart() : LocalDateTime.now();
                List<DailyClass> existingClasses = dailyClassRepository.findByBatchIdOrderByDateDesc(m.getBatch().getId());
                dc = existingClasses != null ? existingClasses.stream()
                        .filter(c -> c.getStatus() != ClassStatus.CANCELLED &&
                                ((c.getDate() != null && Math.abs(java.time.Duration.between(c.getDate(), startDt).toMinutes()) < 15) ||
                                 (c.getMeetLink() != null && c.getMeetLink().equalsIgnoreCase(m.getMeetUrl())) ||
                                 (c.getTitle() != null && c.getTitle().trim().equalsIgnoreCase(m.getTitle().trim()) &&
                                  c.getDate() != null && c.getDate().toLocalDate().equals(startDt.toLocalDate()))))
                        .findFirst()
                        .orElse(null) : null;
                if (dc == null) {
                    dc = new DailyClass();
                    dc.setStatus(ClassStatus.SCHEDULED);
                }
            }
            dc.setBatch(m.getBatch());
            dc.setDate(m.getScheduledStart() != null ? m.getScheduledStart() : LocalDateTime.now());
            dc.setTitle(m.getTitle());
            dc.setMeetLink(m.getMeetUrl());
            dc = dailyClassRepository.save(dc);
            m.setDailyClass(dc);
        }

        MeetingLink saved = meetingLinkRepository.save(m);
        return toResponse(saved, principal);
    }

    @Override
    public MeetingLinkResponse updateMeetingStatus(Long id, MeetingStatus status, JwtUserPrincipal principal) {
        MeetingLink m = meetingLinkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting link not found with id: " + id));
        batchAuthGuard.requireEntityBatchOwnership(principal,
                m.getBatch() != null ? m.getBatch().getId() : null);
        m.setStatus(status);
        if (m.getDailyClass() != null) {
            if (status == MeetingStatus.COMPLETED) {
                m.getDailyClass().setStatus(ClassStatus.COMPLETED);
            } else if (status == MeetingStatus.SCHEDULED) {
                m.getDailyClass().setStatus(ClassStatus.SCHEDULED);
            }
            dailyClassRepository.save(m.getDailyClass());
        }
        MeetingLink saved = meetingLinkRepository.save(m);
        return toResponse(saved, principal);
    }

    @Override
    public void deleteMeetingLink(Long id, JwtUserPrincipal principal) {
        MeetingLink m = meetingLinkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting link not found with id: " + id));
        batchAuthGuard.requireEntityBatchOwnership(principal,
                m.getBatch() != null ? m.getBatch().getId() : null);

        if (m.getStatus() == MeetingStatus.COMPLETED) {
            throw new BadRequestException("Completed meetings cannot be deleted as they serve as historical proof and records of classes conducted.");
        }
        LocalDateTime now = LocalDateTime.now();
        if (m.getScheduledEnd() != null && m.getScheduledEnd().isBefore(now)) {
            throw new BadRequestException("Completed meetings cannot be deleted as they serve as historical proof and records of classes conducted.");
        }

        DailyClass dc = m.getDailyClass();
        meetingAttendeeRepository.deleteByMeetingId(id);
        meetingLinkRepository.delete(m);

        if (dc != null) {
            List<MeetingLink> others = meetingLinkRepository.findByDailyClassIn(List.of(dc));
            if (others.isEmpty()) {
                attendanceCorrectionRepository.deleteByDailyClassId(dc.getId());
                attendanceAuditLogRepository.deleteByDailyClassId(dc.getId());
                attendanceRepository.deleteByDailyClassId(dc.getId());
                dailyClassRepository.delete(dc);
            }
        }
    }

    @Override
    public MeetingLinkResponse getMeetingById(Long id, JwtUserPrincipal principal) {
        schedulerService.autoTransitionStatuses(LocalDateTime.now());
        MeetingLink m = meetingLinkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting link not found with id: " + id));
        batchAuthGuard.requireEntityBatchOwnership(principal,
                m.getBatch() != null ? m.getBatch().getId() : null);
        return toResponse(m, principal);
    }

    @Override
    public List<MeetingLinkResponse> getAdminMeetings(Long courseId, Long batchId, MeetingStatus status, String search, JwtUserPrincipal principal) {
        schedulerService.autoTransitionStatuses(LocalDateTime.now());

        List<MeetingLink> list;
        if (batchAuthGuard.isTrainer(principal)) {
            if (batchId != null && !batchAuthGuard.isValidBatchFilter(principal, batchId)) {
                throw new ForbiddenException("You are not assigned to this batch");
            }
            List<Long> trainerBatchIds = batchRepository.findByTrainerId(principal.id()).stream()
                    .map(Batch::getId).toList();
            if (trainerBatchIds.isEmpty()) {
                return List.of();
            }
            if (batchId != null) {
                list = meetingLinkRepository.findByBatchIdOrderByScheduledStartDesc(batchId);
            } else {
                list = meetingLinkRepository.findByBatchIdInOrderByScheduledStartDesc(trainerBatchIds);
            }
        } else {
            if (batchId != null) {
                list = meetingLinkRepository.findByBatchIdOrderByScheduledStartDesc(batchId);
            } else if (courseId != null) {
                list = meetingLinkRepository.findByCourseIdOrderByScheduledStartDesc(courseId);
            } else {
                list = meetingLinkRepository.findAllByOrderByScheduledStartDesc();
            }
        }

        String searchLower = (search != null && !search.isBlank()) ? search.trim().toLowerCase() : null;

        return deduplicateById(list).stream()
                .filter(m -> {
                    if (courseId != null) {
                        Long cId = m.getCourse() != null ? m.getCourse().getId()
                                : (m.getBatch() != null && m.getBatch().getCourse() != null ? m.getBatch().getCourse().getId() : null);
                        if (cId == null || !cId.equals(courseId)) return false;
                    }
                    if (batchId != null) {
                        Long bId = m.getBatch() != null ? m.getBatch().getId() : null;
                        if (bId == null || !bId.equals(batchId)) return false;
                    }
                    if (status != null) {
                        if (m.getStatus() != status) return false;
                    }
                    if (searchLower != null) {
                        boolean matchTitle = m.getTitle() != null && m.getTitle().toLowerCase().contains(searchLower);
                        boolean matchHost = m.getHostName() != null && m.getHostName().toLowerCase().contains(searchLower);
                        boolean matchUrl = m.getMeetUrl() != null && m.getMeetUrl().toLowerCase().contains(searchLower);
                        boolean matchBatch = m.getBatch() != null && m.getBatch().getName() != null && m.getBatch().getName().toLowerCase().contains(searchLower);
                        boolean matchCourse = m.getCourse() != null && m.getCourse().getTitle() != null && m.getCourse().getTitle().toLowerCase().contains(searchLower);
                        boolean matchDesc = m.getDescription() != null && m.getDescription().toLowerCase().contains(searchLower);
                        if (!matchTitle && !matchHost && !matchUrl && !matchBatch && !matchCourse && !matchDesc) {
                            return false;
                        }
                    }
                    return true;
                })
                .map(m -> toResponse(m, principal))
                .toList();
    }

    @Override
    public List<MeetingLinkResponse> getAdminMeetings(Long batchId, MeetingStatus status, JwtUserPrincipal principal) {
        return getAdminMeetings(null, batchId, status, null, principal);
    }

    private MeetingLinkResponse toResponse(MeetingLink m, JwtUserPrincipal principal) {
        boolean canView = batchAuthGuard.canViewPasscode(principal,
                m.getBatch() != null ? m.getBatch().getId() : null,
                m.getCreatedBy());
        return MeetingLinkResponse.from(m, canView);
    }

    @Override
    public List<MeetingLinkResponse> getStudentMeetings(Long currentUserId) {
        schedulerService.autoTransitionStatuses(LocalDateTime.now());
        StudentScope scope = resolveStudentScope(currentUserId);
        List<MeetingLink> list;
        if (scope.batchIds().isEmpty() && scope.courseIds().isEmpty()) {
            list = meetingLinkRepository.findAllByOrderByScheduledStartDesc();
        } else if (!scope.batchIds().isEmpty() && !scope.courseIds().isEmpty()) {
            list = meetingLinkRepository.findVisibleByBatchIdsOrCourseIds(scope.batchIds(), scope.courseIds());
        } else if (!scope.batchIds().isEmpty()) {
            list = meetingLinkRepository.findVisibleByBatchIds(scope.batchIds());
        } else {
            list = meetingLinkRepository.findVisibleByCourseIds(scope.courseIds());
        }
        return deduplicateById(list).stream().map(MeetingLinkResponse::from).toList();
    }

    @Override
    public List<MeetingLinkResponse> getStudentLiveMeetings(Long currentUserId) {
        schedulerService.autoTransitionStatuses(LocalDateTime.now());
        StudentScope scope = resolveStudentScope(currentUserId);
        List<MeetingLink> list;
        if (scope.batchIds().isEmpty() && scope.courseIds().isEmpty()) {
            list = meetingLinkRepository.findByStatusOrderByScheduledStartAsc(MeetingStatus.LIVE);
        } else if (!scope.batchIds().isEmpty() && !scope.courseIds().isEmpty()) {
            list = meetingLinkRepository.findLiveVisibleByBatchIdsOrCourseIds(scope.batchIds(), scope.courseIds());
        } else if (!scope.batchIds().isEmpty()) {
            list = meetingLinkRepository.findLiveVisibleByBatchIds(scope.batchIds());
        } else {
            list = meetingLinkRepository.findLiveVisibleByCourseIds(scope.courseIds());
        }
        return deduplicateById(list).stream().map(MeetingLinkResponse::from).toList();
    }

    private static List<MeetingLink> deduplicateById(List<MeetingLink> list) {
        if (list == null || list.isEmpty()) return List.of();
        java.util.LinkedHashMap<Long, MeetingLink> map = new java.util.LinkedHashMap<>();
        for (MeetingLink m : list) {
            if (m != null && m.getId() != null) {
                map.putIfAbsent(m.getId(), m);
            }
        }
        return new java.util.ArrayList<>(map.values());
    }

    /** A student's batch/course context used to decide which meetings reach them. */
    private record StudentScope(Set<Long> batchIds, Set<Long> courseIds) {
    }

    private StudentScope resolveStudentScope(Long currentUserId) {
        if (currentUserId == null) {
            return new StudentScope(Set.of(), Set.of());
        }
        Student student = studentRepository.findByUserId(currentUserId).orElse(null);
        if (student == null) {
            return new StudentScope(Set.of(), Set.of());
        }
        Set<Long> batchIds = new HashSet<>();
        Set<Long> courseIds = new HashSet<>();

        if (student.getCourse() != null) {
            courseIds.add(student.getCourse().getId());
        }

        List<Enrollment> enrollments = enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(student.getId());
        if (enrollments != null) {
            for (Enrollment e : enrollments) {
                if (e.getBatch() != null) {
                    batchIds.add(e.getBatch().getId());
                    if (e.getBatch().getCourse() != null) {
                        courseIds.add(e.getBatch().getCourse().getId());
                    }
                }
                if (e.getCourse() != null) {
                    courseIds.add(e.getCourse().getId());
                }
            }
        }

        return new StudentScope(batchIds, courseIds);
    }

    private MeetingPlatform resolvePlatform(String meetUrl, MeetingPlatform explicitPlatform) {
        if (explicitPlatform != null && explicitPlatform != MeetingPlatform.CUSTOM) {
            return explicitPlatform;
        }
        if (meetUrl == null) return MeetingPlatform.CUSTOM;
        String u = meetUrl.toLowerCase();
        if (u.contains("zoom.us") || u.contains("zoomgov.com")) {
            return MeetingPlatform.ZOOM;
        } else if (u.contains("meet.google.com") || u.contains("google.com/meet")) {
            return MeetingPlatform.GOOGLE_MEET;
        } else if (u.contains("teams.microsoft.com") || u.contains("teams.live.com")) {
            return MeetingPlatform.TEAMS;
        } else if (u.contains("webex.com")) {
            return MeetingPlatform.WEBEX;
        }
        return MeetingPlatform.CUSTOM;
    }
}
