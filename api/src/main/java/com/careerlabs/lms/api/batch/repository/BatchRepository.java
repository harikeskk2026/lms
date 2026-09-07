package com.careerlabs.lms.api.batch.repository;

import com.careerlabs.lms.api.batch.entity.Batch;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BatchRepository extends JpaRepository<Batch, Long> {

    List<Batch> findAllByOrderByCreatedAtDesc();

    long countByActive(boolean active);

    List<Batch> findByTrainerId(Long trainerId);

    List<Batch> findByTrainerIdOrderByCreatedAtDesc(Long trainerId);

    @EntityGraph(attributePaths = {"course"})
    List<Batch> findByNameIgnoreCase(String name);

    @EntityGraph(attributePaths = {"course"})
    Optional<Batch> findWithCourseById(Long id);
}
