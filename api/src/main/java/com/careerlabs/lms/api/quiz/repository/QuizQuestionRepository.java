package com.careerlabs.lms.api.quiz.repository;

import com.careerlabs.lms.api.quiz.entity.QuizQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {

    List<QuizQuestion> findByQuizIdOrderByOrderIndexAsc(Long quizId);

    Optional<QuizQuestion> findByQuizIdAndQuestionId(Long quizId, Long questionId);

    boolean existsByQuizIdAndQuestionId(Long quizId, Long questionId);

    long countByQuizId(Long quizId);

    void deleteByQuizIdAndQuestionId(Long quizId, Long questionId);
}
