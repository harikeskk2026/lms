package com.careerlabs.lms.api.enrollment.service;

import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.springframework.stereotype.Component;

/**
 * Central place for relationship-based course access rules:
 * - Admins can view/manage all courses.
 * - Trainers can only view/access courses belonging to their assigned batches. Courses must be
 *   PUBLISHED or ARCHIVED; DRAFT is never visible to non-admins. ARCHIVED remains accessible so
 *   trainers/students already taking the course don't lose access.
 * - Students can only view/access the course belonging to their currently assigned batch or an
 *   active enrollment. Courses must be PUBLISHED or ARCHIVED; DRAFT is never visible to non-admins.
 */
@Component
public class CourseAccessGuard {

    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final BatchRepository batchRepository;
    private final CourseRepository courseRepository;

    public CourseAccessGuard(StudentRepository studentRepository,
                             EnrollmentRepository enrollmentRepository,
                             BatchRepository batchRepository,
                             CourseRepository courseRepository) {
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.batchRepository = batchRepository;
        this.courseRepository = courseRepository;
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
                .map(student -> {
                    boolean assignedInBatch = student.getBatch() != null
                            && student.getBatch().getCourse() != null
                            && courseId.equals(student.getBatch().getCourse().getId());
                    if (assignedInBatch) {
                        return true;
                    }
                    if (student.getId() != null) {
                        return enrollmentRepository.existsByStudentIdAndCourseIdAndActiveTrue(student.getId(), courseId);
                    }
                    return false;
                })
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
        if (!isReadableStatus(course.getId())) {
            throw new ForbiddenException("This course is not currently available");
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

    /** Course content (syllabus/sessions/materials) access: relationship-based AND status must be PUBLISHED or ARCHIVED (DRAFT blocked). */
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
        if (!isReadableStatus(courseId)) {
            throw new ForbiddenException("This course is not currently available");
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

    /** Central status rule: PUBLISHED and ARCHIVED are readable; DRAFT is never readable to non-admins. */
    public boolean isReadableCourseStatus(CourseStatus status) {
        return status == CourseStatus.PUBLISHED || status == CourseStatus.ARCHIVED;
    }

    public boolean isReadableCourse(Long courseId) {
        if (courseId == null) {
            return false;
        }
        return courseRepository.findById(courseId)
                .map(course -> isReadableCourseStatus(course.getStatus()))
                .orElse(false);
    }

    private boolean isReadableStatus(Long courseId) {
        return isReadableCourse(courseId);
    }

    /** Central rule for new enrollments/assignments: only PUBLISHED courses are open. */
    public boolean isAcceptingNewParticipant(CourseStatus status) {
        return status == CourseStatus.PUBLISHED;
    }
}

