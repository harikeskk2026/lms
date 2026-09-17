package com.careerlabs.lms.api.batch.repository;

import com.careerlabs.lms.api.batch.entity.Batch;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BatchRepository extends JpaRepository<Batch, Long> {

    @EntityGraph(attributePaths = {"course", "trainers"})
    List<Batch> findAllByOrderByCreatedAtDesc();

    long countByActive(boolean active);

    // Trainer assignment is now a many-to-many via the batch_trainers join
    // table (Batch.trainers), not a direct column - these keep their original
    // names (so every existing caller is untouched) but are implemented as
    // explicit JPQL joins instead of derived queries.

    @Query("SELECT b FROM Batch b JOIN b.trainers t WHERE t.id = :trainerId")
    List<Batch> findByTrainerId(@Param("trainerId") Long trainerId);

    @Query("SELECT b FROM Batch b JOIN b.trainers t WHERE t.id = :trainerId AND b.active = true")
    List<Batch> findByTrainerIdAndActiveTrue(@Param("trainerId") Long trainerId);

    // DISTINCT matters here (and doesn't for the single-trainerId queries
    // above): a batch with two trainers that are both in trainerIds would
    // otherwise come back twice, once per matching join row.
    @EntityGraph(attributePaths = {"course"})
    @Query("SELECT DISTINCT b FROM Batch b JOIN b.trainers t WHERE t.id IN :trainerIds ORDER BY b.createdAt DESC")
    List<Batch> findByTrainerIdInOrderByCreatedAtDesc(@Param("trainerIds") Collection<Long> trainerIds);

    @EntityGraph(attributePaths = {"course"})
    @Query("SELECT b FROM Batch b JOIN b.trainers t WHERE t.id = :trainerId ORDER BY b.createdAt DESC")
    List<Batch> findByTrainerIdOrderByCreatedAtDesc(@Param("trainerId") Long trainerId);

    @Query("SELECT b FROM Batch b JOIN b.trainers t WHERE t.id = :trainerId AND (b.course.status = com.careerlabs.lms.api.course.entity.CourseStatus.PUBLISHED OR b.course.status = com.careerlabs.lms.api.course.entity.CourseStatus.ARCHIVED) ORDER BY b.createdAt DESC")
    List<Batch> findPublishedByTrainerIdOrderByCreatedAtDesc(@Param("trainerId") Long trainerId);

    @EntityGraph(attributePaths = {"course"})
    List<Batch> findByNameIgnoreCase(String name);

    boolean existsByCourseId(Long courseId);

    List<Batch> findByCourseId(Long courseId);

    @EntityGraph(attributePaths = {"course"})
    Optional<Batch> findWithCourseById(Long id);

    @Query("SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END FROM Batch b JOIN b.trainers t WHERE t.id = :trainerId AND b.course.id = :courseId")
    boolean existsByTrainerIdAndCourseId(@Param("trainerId") Long trainerId, @Param("courseId") Long courseId);

    @Query("SELECT b FROM Batch b JOIN b.trainers t WHERE t.id = :trainerId AND b.course.id = :courseId")
    List<Batch> findByTrainerIdAndCourseId(@Param("trainerId") Long trainerId, @Param("courseId") Long courseId);

    @Query("SELECT b FROM Batch b JOIN b.trainers t WHERE t.id = :trainerId AND (b.course.status = com.careerlabs.lms.api.course.entity.CourseStatus.PUBLISHED OR b.course.status = com.careerlabs.lms.api.course.entity.CourseStatus.ARCHIVED)")
    List<Batch> findPublishedBatchesByTrainerId(@Param("trainerId") Long trainerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Batch b WHERE b.id = :id")
    Optional<Batch> findByIdWithLock(@Param("id") Long id);
}
