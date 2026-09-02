package com.careerlabs.lms.api.announcement.service;

import com.careerlabs.lms.api.announcement.entity.Announcement;
import com.careerlabs.lms.api.student.entity.Student;

import java.util.List;

public interface AnnouncementAudienceService {

    /** All students matching the announcement's batch/college/course + audience-rule filters. */
    List<Student> resolveEligibleStudents(Announcement announcement);

    /** Whether a specific student falls within the announcement's audience (used for the student-facing feed). */
    boolean isEligible(Announcement announcement, Student student);
}
