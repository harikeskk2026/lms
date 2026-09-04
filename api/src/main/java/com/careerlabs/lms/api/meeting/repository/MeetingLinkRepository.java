package com.careerlabs.lms.api.meeting.repository;

import com.careerlabs.lms.api.meeting.entity.MeetingLink;
import com.careerlabs.lms.api.meeting.entity.MeetingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MeetingLinkRepository extends JpaRepository<MeetingLink, Long> {

    List<MeetingLink> findAllByOrderByScheduledStartDesc();

    List<MeetingLink> findByBatchIdOrderByScheduledStartDesc(Long batchId);

    List<MeetingLink> findByStatusOrderByScheduledStartAsc(MeetingStatus status);

    List<MeetingLink> findByBatchIdAndStatusOrderByScheduledStartAsc(Long batchId, MeetingStatus status);

    /**
     * A meeting reaches a student when: it's scoped to the student's own batch, or
     * it's course-wide (no batch set, but the course matches the student's course), or
     * it's fully global (no batch and no course set at all).
     */
    @Query("SELECT m FROM MeetingLink m WHERE " +
            "(m.batch.id = :batchId) OR " +
            "(m.batch IS NULL AND m.course.id = :courseId) OR " +
            "(m.batch IS NULL AND m.course IS NULL) " +
            "ORDER BY m.scheduledStart DESC")
    List<MeetingLink> findVisibleToStudent(@Param("batchId") Long batchId, @Param("courseId") Long courseId);

    @Query("SELECT m FROM MeetingLink m WHERE " +
            "((m.batch.id = :batchId) OR " +
            "(m.batch IS NULL AND m.course.id = :courseId) OR " +
            "(m.batch IS NULL AND m.course IS NULL)) " +
            "AND m.status = 'LIVE' ORDER BY m.scheduledStart ASC")
    List<MeetingLink> findLiveMeetingsVisibleToStudent(@Param("batchId") Long batchId, @Param("courseId") Long courseId);

    /** SCHEDULED or LIVE meetings whose scheduled end time has already passed. */
    @Query("SELECT m FROM MeetingLink m WHERE m.status IN :statuses " +
            "AND m.scheduledEnd IS NOT NULL AND m.scheduledEnd < :now")
    List<MeetingLink> findDueForAutoComplete(@Param("statuses") List<MeetingStatus> statuses,
                                              @Param("now") LocalDateTime now);
}
