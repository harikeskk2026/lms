package com.careerlabs.lms.api.course.repository;

import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, Long> {

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    Optional<Course> findBySlug(String slug);

    Optional<Course> findByTitleIgnoreCase(String title);

    List<Course> findAllByOrderByCreatedAtDesc();

    @Query("SELECT DISTINCT b.course FROM Batch b WHERE b.trainerId = :trainerId AND b.course IS NOT NULL AND b.course.status = com.careerlabs.lms.api.course.entity.CourseStatus.PUBLISHED")
    List<Course> findCoursesByTrainerId(@Param("trainerId") Long trainerId);
}
