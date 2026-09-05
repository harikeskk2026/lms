package com.careerlabs.lms.api.enrollment.repository;

import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long>, JpaSpecificationExecutor<Enrollment> {

    boolean existsByStudentIdAndCourseId(Long studentId, Long courseId);

    boolean existsByStudentIdAndCourseIdAndActiveTrue(Long studentId, Long courseId);

    Optional<Enrollment> findByStudentIdAndCourseId(Long studentId, Long courseId);

    Optional<Enrollment> findByIdAndCourseId(Long id, Long courseId);

    List<Enrollment> findAllByStudentIdOrderByEnrolledAtDesc(Long studentId);

    List<Enrollment> findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(Long studentId);

    long countByCourseId(Long courseId);

    long countByCourseIdAndActiveTrue(Long courseId);

    long countByBatchIdAndActiveTrue(Long batchId);

    void deleteAllByCourseId(Long courseId);

    void deleteAllByStudentId(Long studentId);

    @Override
    @EntityGraph(attributePaths = {"student", "student.user", "student.batch", "course", "batch"})
    Page<Enrollment> findAll(Specification<Enrollment> spec, Pageable pageable);
}
