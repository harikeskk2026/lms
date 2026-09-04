package com.careerlabs.lms.api.meeting.service.impl;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.meeting.dto.response.MeetingAttendeeResponse;
import com.careerlabs.lms.api.meeting.entity.MeetingAttendee;
import com.careerlabs.lms.api.meeting.entity.MeetingLink;
import com.careerlabs.lms.api.meeting.repository.MeetingAttendeeRepository;
import com.careerlabs.lms.api.meeting.repository.MeetingLinkRepository;
import com.careerlabs.lms.api.meeting.service.MeetingAttendeeService;
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

    public MeetingAttendeeServiceImpl(MeetingAttendeeRepository meetingAttendeeRepository,
                                       MeetingLinkRepository meetingLinkRepository,
                                       UserRepository userRepository) {
        this.meetingAttendeeRepository = meetingAttendeeRepository;
        this.meetingLinkRepository = meetingLinkRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void recordJoin(Long meetingId, Long studentUserId) {
        MeetingAttendee attendee = meetingAttendeeRepository
                .findByMeetingIdAndStudentUserId(meetingId, studentUserId)
                .orElseGet(() -> {
                    MeetingLink meeting = meetingLinkRepository.findById(meetingId)
                            .orElseThrow(() -> new ResourceNotFoundException("Meeting link not found with id: " + meetingId));
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
    }

    @Override
    @Transactional(readOnly = true)
    public List<MeetingAttendeeResponse> listAttendees(Long meetingId) {
        if (!meetingLinkRepository.existsById(meetingId)) {
            throw new ResourceNotFoundException("Meeting link not found with id: " + meetingId);
        }

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
