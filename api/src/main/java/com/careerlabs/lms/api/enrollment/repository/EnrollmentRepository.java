package com.careerlabs.lms.api.enrollment.repository;

import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    boolean existsByStudentIdAndCourseId(Long studentId, Long courseId);

    Optional<Enrollment> findByStudentIdAndCourseId(Long studentId, Long courseId);

    List<Enrollment> findAllByStudentIdOrderByEnrolledAtDesc(Long studentId);

    long countByCourseId(Long courseId);

    void deleteAllByCourseId(Long courseId);
}
