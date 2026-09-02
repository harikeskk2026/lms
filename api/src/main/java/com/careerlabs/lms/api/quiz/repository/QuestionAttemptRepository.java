package com.careerlabs.lms.api.quiz.repository;

import com.careerlabs.lms.api.quiz.entity.QuestionAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface QuestionAttemptRepository extends JpaRepository<QuestionAttempt, Long> {

    List<QuestionAttempt> findByAttemptIdOrderByOrderIndexAsc(Long attemptId);

    Optional<QuestionAttempt> findByAttemptIdAndQuestionId(Long attemptId, Long questionId);

    List<QuestionAttempt> findByQuestionId(Long questionId);

    @Query("SELECT qa FROM QuestionAttempt qa " +
            "WHERE qa.attempt.studentId = :studentId AND qa.attempt.status = 'SUBMITTED'")
    List<QuestionAttempt> findAllSubmittedByStudentId(@Param("studentId") Long studentId);

    void deleteAllByAttempt_StudentId(Long studentId);
}
