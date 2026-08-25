package com.careerlabs.lms.api.batch.repository;

import com.careerlabs.lms.api.batch.entity.Batch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BatchRepository extends JpaRepository<Batch, Long> {

    List<Batch> findAllByOrderByCreatedAtDesc();
}
