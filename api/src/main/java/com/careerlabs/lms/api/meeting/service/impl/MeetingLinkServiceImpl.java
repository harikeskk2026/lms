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
import com.careerlabs.lms.api.common.exception.BadRequestException;
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
            MeetingLinkSchedulerService schedulerService
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
    }

    @Override
    public MeetingLinkResponse createMeetingLink(CreateMeetingLinkRequest request, Long currentUserId) {
        if (!StringUtils.hasText(request.getMeetUrl())) {
            throw new BadRequestException("Meeting URL is required");
        }
        if (request.getScheduledStart() != null && request.getScheduledEnd() != null) {
            if (!request.getScheduledEnd().isAfter(request.getScheduledStart())) {
                throw new BadRequestException("Scheduled end time must be after scheduled start time");
            }
        }

        MeetingLink m = new MeetingLink();
        m.setTitle(request.getTitle());
        m.setDescription(request.getDescription());
        m.setMeetUrl(request.getMeetUrl());
        m.setPlatform(request.getPlatform() != null ? request.getPlatform() : MeetingPlatform.ZOOM);
        m.setHostName(request.getHostName());
        m.setScheduledStart(request.getScheduledStart());
        m.setScheduledEnd(request.getScheduledEnd());
        m.setPasscode(request.getPasscode());
        m.setStatus(MeetingStatus.SCHEDULED);
        m.setCreatedBy(currentUserId);

        if (request.getBatchId() != null) {
            Batch batch = batchRepository.findById(request.getBatchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Batch not found with id: " + request.getBatchId()));
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
            DailyClass dc = new DailyClass();
            dc.setBatch(m.getBatch());
            dc.setDate(m.getScheduledStart() != null ? m.getScheduledStart() : LocalDateTime.now());
            dc.setTitle(m.getTitle());
            dc.setMeetLink(m.getMeetUrl());
            dc.setStatus(ClassStatus.SCHEDULED);
            dc = dailyClassRepository.save(dc);
            m.setDailyClass(dc);
        }

        MeetingLink saved = meetingLinkRepository.save(m);
        return MeetingLinkResponse.from(saved);
    }

    @Override
    public MeetingLinkResponse updateMeetingLink(Long id, UpdateMeetingLinkRequest request) {
        MeetingLink m = meetingLinkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting link not found with id: " + id));

        LocalDateTime start = request.getScheduledStart() != null ? request.getScheduledStart() : m.getScheduledStart();
        LocalDateTime end = request.getScheduledEnd() != null ? request.getScheduledEnd() : m.getScheduledEnd();
        if (start != null && end != null && !end.isAfter(start)) {
            throw new BadRequestException("Scheduled end time must be after scheduled start time");
        }

        if (request.getTitle() != null) m.setTitle(request.getTitle());
        if (request.getDescription() != null) m.setDescription(request.getDescription());
        if (request.getMeetUrl() != null) m.setMeetUrl(request.getMeetUrl());
        if (request.getPlatform() != null) m.setPlatform(request.getPlatform());
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
            Batch batch = batchRepository.findById(request.getBatchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Batch not found with id: " + request.getBatchId()));
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
                dc = new DailyClass();
                dc.setStatus(ClassStatus.SCHEDULED);
            }
            dc.setBatch(m.getBatch());
            dc.setDate(m.getScheduledStart() != null ? m.getScheduledStart() : LocalDateTime.now());
            dc.setTitle(m.getTitle());
            dc.setMeetLink(m.getMeetUrl());
            dc = dailyClassRepository.save(dc);
            m.setDailyClass(dc);
        }

        MeetingLink saved = meetingLinkRepository.save(m);
        return MeetingLinkResponse.from(saved);
    }

    @Override
    public MeetingLinkResponse updateMeetingStatus(Long id, MeetingStatus status) {
        MeetingLink m = meetingLinkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting link not found with id: " + id));
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
        return MeetingLinkResponse.from(saved);
    }

    @Override
    public void deleteMeetingLink(Long id) {
        MeetingLink m = meetingLinkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting link not found with id: " + id));
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
    public MeetingLinkResponse getMeetingById(Long id) {
        schedulerService.autoTransitionStatuses(LocalDateTime.now());
        MeetingLink m = meetingLinkRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting link not found with id: " + id));
        return MeetingLinkResponse.from(m);
    }

    @Override
    public List<MeetingLinkResponse> getAdminMeetings(Long batchId, MeetingStatus status) {
        schedulerService.autoTransitionStatuses(LocalDateTime.now());
        List<MeetingLink> list;
        if (batchId != null && status != null) {
            list = meetingLinkRepository.findByBatchIdAndStatusOrderByScheduledStartAsc(batchId, status);
        } else if (batchId != null) {
            list = meetingLinkRepository.findByBatchIdOrderByScheduledStartDesc(batchId);
        } else if (status != null) {
            list = meetingLinkRepository.findByStatusOrderByScheduledStartAsc(status);
        } else {
            list = meetingLinkRepository.findAllByOrderByScheduledStartDesc();
        }
        return list.stream().map(MeetingLinkResponse::from).toList();
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
        return list.stream().map(MeetingLinkResponse::from).toList();
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
        return list.stream().map(MeetingLinkResponse::from).toList();
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

        if (student.getBatch() != null) {
            batchIds.add(student.getBatch().getId());
            if (student.getBatch().getCourse() != null) {
                courseIds.add(student.getBatch().getCourse().getId());
            }
        }
        if (student.getCourse() != null) {
            courseIds.add(student.getCourse().getId());
        }

        try {
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
        } catch (Exception ignored) {
        }

        return new StudentScope(batchIds, courseIds);
    }
}
