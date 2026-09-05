package com.careerlabs.lms.api.enrollment.service;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.springframework.stereotype.Component;

/**
 * Central place for the "who can see/touch this course" rules shared by Course,
 * Syllabus, Session and Material services: admins can always see everything,
 * students only once they're enrolled (or, for the course record itself, once
 * it's published).
 */
@Component
public class CourseAccessGuard {

    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;

    public CourseAccessGuard(StudentRepository studentRepository, EnrollmentRepository enrollmentRepository) {
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    public boolean isAdmin(JwtUserPrincipal principal) {
        if (principal == null || principal.role() == null) {
            return false;
        }
        String role = principal.role().toUpperCase();
        if (role.startsWith("ROLE_")) {
            role = role.substring(5);
        }
        return "ADMIN".equals(role) || "SUPERADMIN".equals(role); 
    }

    public boolean isEnrolled(JwtUserPrincipal principal, Long courseId) {
        if (principal == null) {
            return false;
        }
        return studentRepository.findByUserId(principal.id())
                .map(student -> enrollmentRepository.existsByStudentIdAndCourseIdAndActiveTrue(student.getId(), courseId))
                .orElse(false);
    }

    /** Course browsing/detail visibility: admin always, student if published or enrolled. */
    public void requireVisible(JwtUserPrincipal principal, Course course) {
        if (isAdmin(principal) || course.getStatus() == CourseStatus.PUBLISHED || isEnrolled(principal, course.getId())) {
            return;
        }
        throw new ResourceNotFoundException("Course not found: " + course.getId());
    }

    /** Course content (syllabus/sessions/materials) access: admin always, student only if enrolled. */
    public void requireContentAccess(JwtUserPrincipal principal, Long courseId) {
        if (isAdmin(principal) || isEnrolled(principal, courseId)) {
            return;
        }
        throw new ResourceNotFoundException("Course not found: " + courseId);
    }
}
