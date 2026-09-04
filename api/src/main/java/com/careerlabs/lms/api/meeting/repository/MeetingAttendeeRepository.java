package com.careerlabs.lms.api.meeting.repository;

import com.careerlabs.lms.api.meeting.entity.MeetingAttendee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MeetingAttendeeRepository extends JpaRepository<MeetingAttendee, Long> {

    Optional<MeetingAttendee> findByMeetingIdAndStudentUserId(Long meetingId, Long studentUserId);

    List<MeetingAttendee> findByMeetingIdOrderByFirstJoinedAtAsc(Long meetingId);

    long countByMeetingId(Long meetingId);

    List<MeetingAttendee> findByStudentUserIdAndMeetingIdIn(Long studentUserId, List<Long> meetingIds);
}
