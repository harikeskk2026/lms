package com.careerlabs.lms.api.meeting.repository;

import com.careerlabs.lms.api.meeting.entity.MeetingAttendee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MeetingAttendeeRepository extends JpaRepository<MeetingAttendee, Long> {

    Optional<MeetingAttendee> findByMeetingIdAndStudentUserId(Long meetingId, Long studentUserId);

    List<MeetingAttendee> findByMeetingIdOrderByFirstJoinedAtAsc(Long meetingId);

    long countByMeetingId(Long meetingId);

    List<MeetingAttendee> findByStudentUserIdAndMeetingIdIn(Long studentUserId, List<Long> meetingIds);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM MeetingAttendee a WHERE a.meeting.id = :meetingId")
    void deleteByMeetingId(@Param("meetingId") Long meetingId);
}
