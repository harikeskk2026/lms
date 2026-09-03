package com.careerlabs.lms.api.quiz.repository;

import com.careerlabs.lms.api.quiz.entity.StudentGameStats;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StudentGameStatsRepository extends JpaRepository<StudentGameStats, Long> {

    Optional<StudentGameStats> findByStudentId(Long studentId);

    void deleteByStudentId(Long studentId);
}
