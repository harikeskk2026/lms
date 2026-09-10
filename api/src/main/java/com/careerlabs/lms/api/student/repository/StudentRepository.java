package com.careerlabs.lms.api.student.repository;

import com.careerlabs.lms.api.student.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long>, JpaSpecificationExecutor<Student> {

    boolean existsByEnrollmentNo(String enrollmentNo);

    List<Student> findByBatchId(Long batchId);

    long countByBatchId(Long batchId);

    List<Student> findByBatchIdIn(List<Long> batchIds);

    List<Student> findByCourseId(Long courseId);

    List<Student> findByCourseIdIn(List<Long> courseIds);

    List<Student> findByUser_ActiveTrue();

    List<Student> findByUser_ActiveTrueAndBatchIdIn(List<Long> batchIds);

    List<Student> findByUser_ActiveTrueAndCourseIdIn(List<Long> courseIds);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user", "batch", "batch.course", "college", "course"})
    Optional<Student> findByUserId(Long userId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user"})
    Optional<Student> findWithUserById(Long id);

    @Query("SELECT s.placementStatus AS status, COUNT(s) AS count FROM Student s GROUP BY s.placementStatus")
    List<PlacementStatusCount> countGroupedByPlacementStatus();

    long countByUser_ActiveTrue();

    List<Student> findTop10ByOrderByCreatedAtDesc();
}
