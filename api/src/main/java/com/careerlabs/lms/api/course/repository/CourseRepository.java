package com.careerlabs.lms.api.course.repository;

import com.careerlabs.lms.api.course.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, Long> {

    boolean existsBySlug(String slug);

    Optional<Course> findBySlug(String slug);

    List<Course> findAllByOrderByCreatedAtDesc();
}
