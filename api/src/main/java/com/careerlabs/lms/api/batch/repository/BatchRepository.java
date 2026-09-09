package com.careerlabs.lms.api.batch.repository;

import com.careerlabs.lms.api.batch.entity.Batch;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BatchRepository extends JpaRepository<Batch, Long> {

    List<Batch> findAllByOrderByCreatedAtDesc();

    long countByActive(boolean active);

    List<Batch> findByTrainerId(Long trainerId);

    List<Batch> findByTrainerIdAndActiveTrue(Long trainerId);

    @EntityGraph(attributePaths = {"course"})
    List<Batch> findByTrainerIdInOrderByCreatedAtDesc(Collection<Long> trainerIds);

    @EntityGraph(attributePaths = {"course"})
    List<Batch> findByTrainerIdOrderByCreatedAtDesc(Long trainerId);

    @Query("SELECT b FROM Batch b WHERE b.trainerId = :trainerId AND b.course.status = com.careerlabs.lms.api.course.entity.CourseStatus.PUBLISHED ORDER BY b.createdAt DESC")
    List<Batch> findPublishedByTrainerIdOrderByCreatedAtDesc(@Param("trainerId") Long trainerId);

    @EntityGraph(attributePaths = {"course"})
    List<Batch> findByNameIgnoreCase(String name);

    boolean existsByCourseId(Long courseId);

    @EntityGraph(attributePaths = {"course"})
    Optional<Batch> findWithCourseById(Long id);

    @Query("SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END FROM Batch b WHERE b.trainerId = :trainerId AND b.course.id = :courseId")
    boolean existsByTrainerIdAndCourseId(@Param("trainerId") Long trainerId, @Param("courseId") Long courseId);

    @Query("SELECT b FROM Batch b WHERE b.trainerId = :trainerId AND b.course.status = com.careerlabs.lms.api.course.entity.CourseStatus.PUBLISHED")
    List<Batch> findPublishedBatchesByTrainerId(@Param("trainerId") Long trainerId);
}
