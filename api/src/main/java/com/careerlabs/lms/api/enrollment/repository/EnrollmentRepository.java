package com.careerlabs.lms.api.enrollment.repository;

import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.student.entity.Student;
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

    @Query("SELECT COUNT(DISTINCT e.student.id) FROM Enrollment e WHERE e.batch.id = :batchId AND e.active = true")
    long countByBatchIdAndActiveTrue(@Param("batchId") Long batchId);

    List<Enrollment> findByBatchIdAndActiveTrue(Long batchId);

    List<Enrollment> findByBatchIdInAndActiveTrue(List<Long> batchIds);

    boolean existsByStudentIdAndBatchIdAndActiveTrue(Long studentId, Long batchId);

    Optional<Enrollment> findByStudentIdAndBatchIdAndActiveTrue(Long studentId, Long batchId);

    List<Enrollment> findByStudentIdInAndActiveTrue(List<Long> studentIds);

    @Query("SELECT DISTINCT e.student FROM Enrollment e WHERE e.batch.id = :batchId AND e.active = true")
    List<Student> findActiveStudentsByBatchId(@Param("batchId") Long batchId);

    @Query("SELECT DISTINCT e.student FROM Enrollment e WHERE e.batch.id IN :batchIds AND e.active = true")
    List<Student> findActiveStudentsByBatchIdIn(@Param("batchIds") List<Long> batchIds);

    @Query("SELECT DISTINCT e.student FROM Enrollment e WHERE e.course.id IN :courseIds AND e.active = true")
    List<Student> findActiveStudentsByCourseIdIn(@Param("courseIds") List<Long> courseIds);

    @Query("SELECT DISTINCT e.batch FROM Enrollment e WHERE e.student.id = :studentId AND e.active = true AND e.batch IS NOT NULL")
    List<Batch> findActiveBatchesByStudentId(@Param("studentId") Long studentId);

    void deleteAllByCourseId(Long courseId);

    void deleteAllByStudentId(Long studentId);

    @Override
    @EntityGraph(attributePaths = {"student", "student.user", "course", "batch"})
    Page<Enrollment> findAll(Specification<Enrollment> spec, Pageable pageable);
}
