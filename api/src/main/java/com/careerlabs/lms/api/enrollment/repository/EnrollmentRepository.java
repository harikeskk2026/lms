package com.careerlabs.lms.api.enrollment.repository;

import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long>, JpaSpecificationExecutor<Enrollment> {

    @Query("SELECT DISTINCT e.course.title FROM Enrollment e WHERE e.student.id = :studentId AND e.active = true AND e.course.title IS NOT NULL ORDER BY e.course.title ASC")
    List<String> findActiveCourseTitlesByStudentId(@Param("studentId") Long studentId);

    @Query("SELECT DISTINCT e.course.title FROM Enrollment e WHERE e.student.id = :studentId AND e.course.title IS NOT NULL ORDER BY e.course.title ASC")
    List<String> findAllCourseTitlesByStudentId(@Param("studentId") Long studentId);

    @Query("SELECT DISTINCT e.student.id FROM Enrollment e WHERE e.course.id = :courseId AND e.active = true")
    List<Long> findActiveStudentIdsByCourseId(@Param("courseId") Long courseId);

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
