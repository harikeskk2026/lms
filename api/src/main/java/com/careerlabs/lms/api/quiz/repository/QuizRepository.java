package com.careerlabs.lms.api.quiz.repository;

import com.careerlabs.lms.api.quiz.entity.Quiz;
import com.careerlabs.lms.api.quiz.entity.QuizStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface QuizRepository extends JpaRepository<Quiz, Long> {

    List<Quiz> findAllByOrderByCreatedAtDesc();

    List<Quiz> findAllByStatusOrderByCreatedAtDesc(QuizStatus status);
 
    long countByStatus(QuizStatus status);

    @Query("SELECT q.id FROM Quiz q WHERE q.batchId = :batchId")
    List<Long> findIdsByBatchId(@Param("batchId") Long batchId);

    @Query("SELECT q.id FROM Quiz q WHERE q.courseId = :courseId AND q.batchId IS NULL")
    List<Long> findCourseLevelIdsByCourseId(@Param("courseId") Long courseId);

    @Query("SELECT q.id FROM Quiz q WHERE q.courseId = :courseId")
    List<Long> findIdsByCourseId(@Param("courseId") Long courseId);

    long countByCreatedBy(Long createdBy);
}
