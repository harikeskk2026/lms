package com.careerlabs.lms.api.attendance.service.impl;

import com.careerlabs.lms.api.attendance.dto.response.AttendanceVerificationResponse;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceVerificationResponse.MatchedMeeting;
import com.careerlabs.lms.api.attendance.entity.AttendanceCorrection;
import com.careerlabs.lms.api.attendance.entity.DailyClass;
import com.careerlabs.lms.api.attendance.repository.AttendanceCorrectionRepository;
import com.careerlabs.lms.api.attendance.service.AttendanceVerificationService;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.meeting.entity.MeetingAttendee;
import com.careerlabs.lms.api.meeting.entity.MeetingLink;
import com.careerlabs.lms.api.meeting.repository.MeetingAttendeeRepository;
import com.careerlabs.lms.api.meeting.repository.MeetingLinkRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AttendanceVerificationServiceImpl implements AttendanceVerificationService {

    private final AttendanceCorrectionRepository attendanceCorrectionRepository;
    private final MeetingLinkRepository meetingLinkRepository;
    private final MeetingAttendeeRepository meetingAttendeeRepository;

    public AttendanceVerificationServiceImpl(AttendanceCorrectionRepository attendanceCorrectionRepository,
                                              MeetingLinkRepository meetingLinkRepository,
                                              MeetingAttendeeRepository meetingAttendeeRepository) {
        this.attendanceCorrectionRepository = attendanceCorrectionRepository;
        this.meetingLinkRepository = meetingLinkRepository;
        this.meetingAttendeeRepository = meetingAttendeeRepository;
    }

    @Override
    public AttendanceVerificationResponse verify(Long correctionId) {
        AttendanceCorrection correction = attendanceCorrectionRepository.findById(correctionId)
                .orElseThrow(() -> new ResourceNotFoundException("Correction request not found with id: " + correctionId));

        DailyClass dailyClass = correction.getAttendance().getDailyClass();
        Long studentUserId = correction.getStudent().getUser().getId();
        Long batchId = dailyClass.getBatch().getId();

        LocalDateTime dayStart = dailyClass.getDate().toLocalDate().atStartOfDay();
        LocalDateTime dayEnd = dayStart.plusDays(1);

        List<MeetingLink> candidates = meetingLinkRepository
                .findByBatchIdAndScheduledStartBetweenOrderByScheduledStartAsc(batchId, dayStart, dayEnd);

        List<Long> meetingIds = candidates.stream().map(MeetingLink::getId).toList();
        Map<Long, MeetingAttendee> joinsByMeetingId = meetingIds.isEmpty() ? Map.of()
                : meetingAttendeeRepository.findByStudentUserIdAndMeetingIdIn(studentUserId, meetingIds).stream()
                        .collect(Collectors.toMap(a -> a.getMeeting().getId(), Function.identity()));

        List<MatchedMeeting> matched = candidates.stream()
                .map(m -> {
                    MeetingAttendee join = joinsByMeetingId.get(m.getId());
                    return new MatchedMeeting(
                            m.getId(), m.getTitle(), m.getPlatform().name(), m.getScheduledStart(),
                            join != null,
                            join != null ? join.getFirstJoinedAt() : null,
                            join != null ? join.getLastJoinedAt() : null,
                            join != null ? join.getJoinCount() : 0);
                })
                .toList();

        boolean verified = matched.stream().anyMatch(MatchedMeeting::joined);

        return new AttendanceVerificationResponse(
                dailyClass.getId(), dailyClass.getTitle(), dailyClass.getDate(), verified, matched);
    }
}
