package com.careerlabs.lms.api.course.repository;

import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, Long> {

    boolean existsByTitleIgnoreCase(String title);

    boolean existsByTitleIgnoreCaseAndIdNot(String title, Long id);

    boolean existsByCourseCode(String courseCode);

    Optional<Course> findByTitleIgnoreCase(String title);

    List<Course> findAllByOrderByCreatedAtDesc();

    List<Course> findByStatusOrderByCreatedAtDesc(CourseStatus status);
 
    long countByStatus(CourseStatus status);

    @Query("SELECT DISTINCT b.course FROM Batch b JOIN b.trainers t WHERE t.id = :trainerId AND b.course IS NOT NULL AND (b.course.status = com.careerlabs.lms.api.course.entity.CourseStatus.PUBLISHED OR b.course.status = com.careerlabs.lms.api.course.entity.CourseStatus.ARCHIVED)")
    List<Course> findCoursesByTrainerId(@Param("trainerId") Long trainerId);
}
