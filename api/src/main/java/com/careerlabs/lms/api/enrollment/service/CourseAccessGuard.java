package com.careerlabs.lms.api.enrollment.service;

import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.springframework.stereotype.Component;

/**
 * Central place for relationship-based course access rules:
 * - Admins can view/manage all courses.
 * - Trainers can only view/access courses belonging to their assigned batches.
 * - Students can only view/access the course belonging to their currently assigned batch.
 */
@Component
public class CourseAccessGuard {

    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final BatchRepository batchRepository;

    public CourseAccessGuard(StudentRepository studentRepository,
                             EnrollmentRepository enrollmentRepository,
                             BatchRepository batchRepository) {
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.batchRepository = batchRepository;
    }

    public boolean isAdmin(JwtUserPrincipal principal) {
        if (principal == null || principal.role() == null) {
            return false;
        }
        String role = normalizeRole(principal.role());
        return "ADMIN".equals(role) || "SUPERADMIN".equals(role); 
    }

    public boolean isTrainer(JwtUserPrincipal principal) {
        if (principal == null || principal.role() == null) {
            return false;
        }
        return "TRAINER".equals(normalizeRole(principal.role()));
    }

    public boolean isStudent(JwtUserPrincipal principal) {
        if (principal == null || principal.role() == null) {
            return false;
        }
        return "STUDENT".equals(normalizeRole(principal.role()));
    }

    private String normalizeRole(String role) {
        if (role == null) return "";
        String r = role.toUpperCase();
        return r.startsWith("ROLE_") ? r.substring(5) : r;
    }

    public boolean isTrainerForCourse(JwtUserPrincipal principal, Long courseId) {
        if (!isTrainer(principal) || courseId == null) {
            return false;
        }
        return batchRepository.existsByTrainerIdAndCourseId(principal.id(), courseId);
    }

    public boolean isStudentForCourse(JwtUserPrincipal principal, Long courseId) {
        if (!isStudent(principal) || courseId == null) {
            return false;
        }
        return studentRepository.findByUserId(principal.id())
                .map(student -> student.getBatch() != null
                        && student.getBatch().getCourse() != null
                        && courseId.equals(student.getBatch().getCourse().getId()))
                .orElse(false);
    }

    public boolean isEnrolled(JwtUserPrincipal principal, Long courseId) {
        if (principal == null || courseId == null) {
            return false;
        }
        if (isAdmin(principal)) {
            return true;
        }
        if (isTrainer(principal)) {
            return isTrainerForCourse(principal, courseId);
        }
        if (isStudent(principal)) {
            return isStudentForCourse(principal, courseId);
        }
        return false;
    }

    /** Course browsing/detail visibility: strictly relationship-based. */
    public void requireVisible(JwtUserPrincipal principal, Course course) {
        if (principal == null) {
            throw new ForbiddenException("Authentication required");
        }
        if (isAdmin(principal)) {
            return;
        }
        if (course == null || course.getId() == null) {
            throw new ForbiddenException("Course not found");
        }
        if (isTrainer(principal)) {
            if (isTrainerForCourse(principal, course.getId())) {
                return;
            }
            throw new ForbiddenException("You are not assigned to any batch for this course");
        }
        if (isStudent(principal)) {
            if (isStudentForCourse(principal, course.getId())) {
                return;
            }
            throw new ForbiddenException("You are not assigned to any batch for this course");
        }
        throw new ForbiddenException("Access denied");
    }

    /** Course content (syllabus/sessions/materials) access: strictly relationship-based. */
    public void requireContentAccess(JwtUserPrincipal principal, Long courseId) {
        if (principal == null) {
            throw new ForbiddenException("Authentication required");
        }
        if (isAdmin(principal)) {
            return;
        }
        if (courseId == null) {
            throw new ForbiddenException("Course not found");
        }
        if (isTrainer(principal)) {
            if (isTrainerForCourse(principal, courseId)) {
                return;
            }
            throw new ForbiddenException("You are not assigned to any batch for this course");
        }
        if (isStudent(principal)) {
            if (isStudentForCourse(principal, courseId)) {
                return;
            }
            throw new ForbiddenException("You are not assigned to any batch for this course");
        }
        throw new ForbiddenException("Access denied");
    }
}

