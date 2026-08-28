package com.careerlabs.lms.api.quiz.repository;

import com.careerlabs.lms.api.quiz.entity.AttemptStatus;
import com.careerlabs.lms.api.quiz.entity.QuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {

    List<QuizAttempt> findByQuizIdAndStudentIdOrderByAttemptNumberDesc(Long quizId, Long studentId);

    Optional<QuizAttempt> findByQuizIdAndStudentIdAndStatus(Long quizId, Long studentId, AttemptStatus status);

    long countByQuizIdAndStudentIdAndStatus(Long quizId, Long studentId, AttemptStatus status);

    long countByStudentIdAndStatus(Long studentId, AttemptStatus status);

    boolean existsByQuizId(Long quizId);

    List<QuizAttempt> findByStudentIdOrderByStartedAtDesc(Long studentId);

    List<QuizAttempt> findByQuizIdAndStatusOrderByScoreDescTimeTakenAsc(Long quizId, AttemptStatus status);

    List<QuizAttempt> findByQuizIdAndStatus(Long quizId, AttemptStatus status);

    @Query("SELECT a FROM QuizAttempt a WHERE a.status = 'SUBMITTED' AND a.completedAt >= :since")
    List<QuizAttempt> findAllSubmittedSince(@Param("since") Instant since);

    List<QuizAttempt> findByStudentIdInAndStatus(List<Long> studentIds, AttemptStatus status);

    List<QuizAttempt> findByStatus(AttemptStatus status);

    long countByStatus(AttemptStatus status);

    List<QuizAttempt> findTop10ByStatusOrderByCompletedAtDesc(AttemptStatus status);
}
