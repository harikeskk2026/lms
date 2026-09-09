package com.careerlabs.lms.api.announcement.service;

import com.careerlabs.lms.api.announcement.entity.Announcement;
import com.careerlabs.lms.api.student.entity.Student;

import java.util.List;

public interface AnnouncementAudienceService {

    /** All students matching the announcement's batch/college/course + audience-rule filters. */
    List<Student> resolveEligibleStudents(Announcement announcement);

    /** Whether a specific student falls within the announcement's audience (used for the student-facing feed). */
    boolean isEligible(Announcement announcement, Student student);

    /**
     * Whether the user (identified by user id) falls within the announcement's audience.
     * Users without a student profile are never eligible. Fails closed: any internal
     * failure resolves to {@code false} (deny).
     */
    boolean isUserEligible(Announcement announcement, Long userId);

    /** Number of students that fall within the announcement's audience (admin audience preview/analytics). */
    long countEligibleStudents(Announcement announcement);
}
