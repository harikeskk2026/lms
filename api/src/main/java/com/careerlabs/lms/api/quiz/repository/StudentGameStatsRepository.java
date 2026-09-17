package com.careerlabs.lms.api.quiz.repository;

import com.careerlabs.lms.api.quiz.entity.StudentGameStats;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface StudentGameStatsRepository extends JpaRepository<StudentGameStats, Long> {

    Optional<StudentGameStats> findByStudentId(Long studentId);

    List<StudentGameStats> findByStudentIdIn(Collection<Long> studentIds);

    void deleteByStudentId(Long studentId);
}
