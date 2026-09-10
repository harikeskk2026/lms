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
            "(m.batch.id IN :batchIds) OR " +
            "(m.course.id IN :courseIds) OR " +
            "(m.batch IS NULL AND m.course IS NULL) " +
            "ORDER BY m.scheduledStart DESC")
    List<MeetingLink> findVisibleByBatchIdsOrCourseIds(@Param("batchIds") java.util.Collection<Long> batchIds, @Param("courseIds") java.util.Collection<Long> courseIds);

    @Query("SELECT m FROM MeetingLink m WHERE " +
            "(m.batch.id IN :batchIds) OR " +
            "(m.batch IS NULL AND m.course IS NULL) " +
            "ORDER BY m.scheduledStart DESC")
    List<MeetingLink> findVisibleByBatchIds(@Param("batchIds") java.util.Collection<Long> batchIds);

    @Query("SELECT m FROM MeetingLink m WHERE " +
            "(m.course.id IN :courseIds) OR " +
            "(m.batch IS NULL AND m.course IS NULL) " +
            "ORDER BY m.scheduledStart DESC")
    List<MeetingLink> findVisibleByCourseIds(@Param("courseIds") java.util.Collection<Long> courseIds);

    @Query("SELECT m FROM MeetingLink m WHERE " +
            "((m.batch.id = :batchId) OR " +
            "(m.batch IS NULL AND m.course.id = :courseId) OR " +
            "(m.batch IS NULL AND m.course IS NULL)) " +
            "AND m.status = 'LIVE' ORDER BY m.scheduledStart ASC")
    List<MeetingLink> findLiveMeetingsVisibleToStudent(@Param("batchId") Long batchId, @Param("courseId") Long courseId);

    @Query("SELECT m FROM MeetingLink m WHERE " +
            "((m.batch.id IN :batchIds) OR " +
            "(m.course.id IN :courseIds) OR " +
            "(m.batch IS NULL AND m.course IS NULL)) " +
            "AND m.status = 'LIVE' ORDER BY m.scheduledStart ASC")
    List<MeetingLink> findLiveVisibleByBatchIdsOrCourseIds(@Param("batchIds") java.util.Collection<Long> batchIds, @Param("courseIds") java.util.Collection<Long> courseIds);

    @Query("SELECT m FROM MeetingLink m WHERE " +
            "((m.batch.id IN :batchIds) OR " +
            "(m.batch IS NULL AND m.course IS NULL)) " +
            "AND m.status = 'LIVE' ORDER BY m.scheduledStart ASC")
    List<MeetingLink> findLiveVisibleByBatchIds(@Param("batchIds") java.util.Collection<Long> batchIds);

    @Query("SELECT m FROM MeetingLink m WHERE " +
            "((m.course.id IN :courseIds) OR " +
            "(m.batch IS NULL AND m.course IS NULL)) " +
            "AND m.status = 'LIVE' ORDER BY m.scheduledStart ASC")
    List<MeetingLink> findLiveVisibleByCourseIds(@Param("courseIds") java.util.Collection<Long> courseIds);

    /** LIVE meetings (or SCHEDULED meetings whose start time has arrived) whose scheduled end time has passed. */
    @Query("SELECT m FROM MeetingLink m WHERE m.status IN :statuses " +
            "AND (m.scheduledStart IS NULL OR m.scheduledStart <= :now) " +
            "AND m.scheduledEnd IS NOT NULL AND m.scheduledEnd <= :now")
    List<MeetingLink> findDueForAutoComplete(@Param("statuses") List<MeetingStatus> statuses,
                                              @Param("now") LocalDateTime now);

    /** Meetings marked COMPLETED but whose scheduled start time is still in the future. */
    @Query("SELECT m FROM MeetingLink m WHERE m.status = 'COMPLETED' " +
            "AND m.scheduledStart IS NOT NULL AND m.scheduledStart > :now")
    List<MeetingLink> findPrematurelyCompleted(@Param("now") LocalDateTime now);

    /** SCHEDULED meetings whose scheduled start time has arrived and end time hasn't passed. */
    @Query("SELECT m FROM MeetingLink m WHERE m.status = 'SCHEDULED' " +
            "AND m.scheduledStart IS NOT NULL AND m.scheduledStart <= :now " +
            "AND (m.scheduledEnd IS NULL OR m.scheduledEnd > :now)")
    List<MeetingLink> findDueForAutoStart(@Param("now") LocalDateTime now);

    /** Scheduled classes for a batch that fall within a given time window — used to match a
     *  manually-marked attendance session (DailyClass) against any Zoom link created for it. */
    List<MeetingLink> findByBatchIdAndScheduledStartBetweenOrderByScheduledStartAsc(
            Long batchId, LocalDateTime from, LocalDateTime to);

    /** All scheduled classes across all batches/courses that fall within a given date window. */
    List<MeetingLink> findByScheduledStartBetweenOrderByScheduledStartAsc(
            LocalDateTime from, LocalDateTime to);

    /** Scheduled classes that belong to a batch but don't yet have a DailyClass linked. */
    List<MeetingLink> findByDailyClassIsNullAndBatchIsNotNull();

    /** All scheduled classes linked directly to the given list of DailyClasses. */
    List<MeetingLink> findByDailyClassIn(List<com.careerlabs.lms.api.attendance.entity.DailyClass> dailyClasses);

    /** Same visibility rule as {@link #findVisibleToStudent}, narrowed to a single day —
     *  used to surface Scheduled Class sessions on the student's attendance calendar even
     *  when no DailyClass/attendance record exists for them yet. */
    @Query("SELECT m FROM MeetingLink m WHERE " +
            "((m.batch.id = :batchId) OR " +
            "(m.batch IS NULL AND m.course.id = :courseId) OR " +
            "(m.batch IS NULL AND m.course IS NULL)) " +
            "AND m.scheduledStart >= :dayStart AND m.scheduledStart < :dayEnd " +
            "ORDER BY m.scheduledStart ASC")
    List<MeetingLink> findVisibleToStudentOnDate(@Param("batchId") Long batchId, @Param("courseId") Long courseId,
                                                  @Param("dayStart") LocalDateTime dayStart, @Param("dayEnd") LocalDateTime dayEnd);
}

