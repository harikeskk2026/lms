package com.careerlabs.lms.api.meeting.service.impl;

import com.careerlabs.lms.api.attendance.entity.Attendance;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.batch.service.BatchAuthorizationGuard;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.meeting.dto.response.MeetingAttendeeResponse;
import com.careerlabs.lms.api.meeting.entity.MeetingAttendee;
import com.careerlabs.lms.api.meeting.entity.MeetingLink;
import com.careerlabs.lms.api.meeting.entity.MeetingStatus;
import com.careerlabs.lms.api.meeting.repository.MeetingAttendeeRepository;
import com.careerlabs.lms.api.meeting.repository.MeetingLinkRepository;
import com.careerlabs.lms.api.meeting.service.MeetingAttendeeService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
public class MeetingAttendeeServiceImpl implements MeetingAttendeeService {

    private final MeetingAttendeeRepository meetingAttendeeRepository;
    private final MeetingLinkRepository meetingLinkRepository;
    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;
    private final StudentRepository studentRepository;
    private final BatchAuthorizationGuard batchAuthGuard;

    public MeetingAttendeeServiceImpl(MeetingAttendeeRepository meetingAttendeeRepository,
                                       MeetingLinkRepository meetingLinkRepository,
                                       UserRepository userRepository,
                                       AttendanceRepository attendanceRepository,
                                       StudentRepository studentRepository,
                                       BatchAuthorizationGuard batchAuthGuard) {
        this.meetingAttendeeRepository = meetingAttendeeRepository;
        this.meetingLinkRepository = meetingLinkRepository;
        this.userRepository = userRepository;
        this.attendanceRepository = attendanceRepository;
        this.studentRepository = studentRepository;
        this.batchAuthGuard = batchAuthGuard;
    }

    @Override
    public void recordJoin(Long meetingId, Long studentUserId) {
        MeetingLink meeting = meetingLinkRepository.findById(meetingId)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting link not found with id: " + meetingId));

        if (meeting.getStatus() == MeetingStatus.SCHEDULED && meeting.getScheduledStart() != null && meeting.getScheduledStart().isAfter(java.time.LocalDateTime.now())) {
            throw new com.careerlabs.lms.api.common.exception.BadRequestException("Class has not started yet. You can join once the scheduled time arrives.");
        }

        MeetingAttendee attendee = meetingAttendeeRepository
                .findByMeetingIdAndStudentUserId(meetingId, studentUserId)
                .orElseGet(() -> {
                    MeetingAttendee a = new MeetingAttendee();
                    a.setMeeting(meeting);
                    a.setStudentUserId(studentUserId);
                    return a;
                });

        if (attendee.getId() != null) {
            attendee.setLastJoinedAt(Instant.now());
            attendee.setJoinCount(attendee.getJoinCount() + 1);
        }
        meetingAttendeeRepository.save(attendee);

        // Auto-mark student PRESENT for the scheduled class session
        if (meeting.getDailyClass() != null) {
            studentRepository.findByUserId(studentUserId).ifPresent(student -> {
                Attendance att = attendanceRepository
                        .findByStudentIdAndDailyClassId(student.getId(), meeting.getDailyClass().getId())
                        .orElseGet(() -> {
                            Attendance a = new Attendance();
                            a.setStudent(student);
                            a.setDailyClass(meeting.getDailyClass());
                            return a;
                        });
                att.setStatus(AttendStatus.PRESENT);
                att.setRemarks("Auto-marked present: joined online scheduled class");
                att.setMarkedAt(Instant.now());
                attendanceRepository.save(att);
            });
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<MeetingAttendeeResponse> listAttendees(Long meetingId, JwtUserPrincipal principal) {
        MeetingLink meeting = meetingLinkRepository.findById(meetingId)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting link not found with id: " + meetingId));

        batchAuthGuard.requireEntityBatchOwnership(principal,
                meeting.getBatch() != null ? meeting.getBatch().getId() : null);

        List<MeetingAttendee> attendees = meetingAttendeeRepository.findByMeetingIdOrderByFirstJoinedAtAsc(meetingId);
        List<Long> userIds = attendees.stream().map(MeetingAttendee::getStudentUserId).toList();
        Map<Long, User> usersById = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        return attendees.stream()
                .map(a -> {
                    User user = usersById.get(a.getStudentUserId());
                    return MeetingAttendeeResponse.from(a,
                            user != null ? user.getName() : "Unknown student",
                            user != null ? user.getEmail() : null);
                })
                .toList();
    }
}
