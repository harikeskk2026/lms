package com.careerlabs.lms.api.meeting.service.impl;

import com.careerlabs.lms.api.attendance.entity.ClassStatus;
import com.careerlabs.lms.api.attendance.entity.DailyClass;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.batch.entity.Batch;
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
import com.careerlabs.lms.api.meeting.repository.MeetingLinkRepository;
import com.careerlabs.lms.api.meeting.service.MeetingLinkService;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.springframework.util.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class MeetingLinkServiceImpl implements MeetingLinkService {

    private final MeetingLinkRepository meetingLinkRepository;
    private final BatchRepository batchRepository;
    private final CourseRepository courseRepository;
    private final DailyClassRepository dailyClassRepository;
    private final StudentRepository studentRepository;
    private final MeetingLinkSchedulerService schedulerService;

    public MeetingLinkServiceImpl(
            MeetingLinkRepository meetingLinkRepository,
            BatchRepository batchRepository,
            CourseRepository courseRepository,
            DailyClassRepository dailyClassRepository,
            StudentRepository studentRepository,
            MeetingLinkSchedulerService schedulerService
    ) {
        this.meetingLinkRepository = meetingLinkRepository;
        this.batchRepository = batchRepository;
        this.courseRepository = courseRepository;
        this.dailyClassRepository = dailyClassRepository;
        this.studentRepository = studentRepository;
        this.schedulerService = schedulerService;
    }

    @Override
    public MeetingLinkResponse createMeetingLink(CreateMeetingLinkRequest request, Long currentUserId) {
        if (!StringUtils.hasText(request.getMeetUrl())) {
            throw new BadRequestException("Meeting URL is required");
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
        if (m.getDailyClass() != null && status == MeetingStatus.COMPLETED) {
            m.getDailyClass().setStatus(ClassStatus.COMPLETED);
            dailyClassRepository.save(m.getDailyClass());
        }
        MeetingLink saved = meetingLinkRepository.save(m);
        return MeetingLinkResponse.from(saved);
    }

    @Override
    public void deleteMeetingLink(Long id) {
        if (!meetingLinkRepository.existsById(id)) {
            throw new ResourceNotFoundException("Meeting link not found with id: " + id);
        }
        meetingLinkRepository.deleteById(id);
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
        List<MeetingLink> list = meetingLinkRepository.findVisibleToStudent(scope.batchId(), scope.courseId());
        return list.stream().map(MeetingLinkResponse::from).toList();
    }

    @Override
    public List<MeetingLinkResponse> getStudentLiveMeetings(Long currentUserId) {
        schedulerService.autoTransitionStatuses(LocalDateTime.now());
        StudentScope scope = resolveStudentScope(currentUserId);
        List<MeetingLink> list = meetingLinkRepository.findLiveMeetingsVisibleToStudent(scope.batchId(), scope.courseId());
        return list.stream().map(MeetingLinkResponse::from).toList();
    }

    /** A student's batch/course context used to decide which meetings reach them. */
    private record StudentScope(Long batchId, Long courseId) {
    }

    private StudentScope resolveStudentScope(Long currentUserId) {
        Student student = studentRepository.findByUserId(currentUserId).orElse(null);
        if (student == null) {
            return new StudentScope(null, null);
        }
        Long batchId = student.getBatch() != null ? student.getBatch().getId() : null;
        Long courseId = student.getCourse() != null ? student.getCourse().getId() : null;
        return new StudentScope(batchId, courseId);
    }
}
