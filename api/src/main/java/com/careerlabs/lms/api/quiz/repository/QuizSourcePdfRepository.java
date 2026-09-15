package com.careerlabs.lms.api.quiz.repository;

import com.careerlabs.lms.api.quiz.entity.QuizSourcePdf;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface QuizSourcePdfRepository extends JpaRepository<QuizSourcePdf, Long> {

    Optional<QuizSourcePdf> findByQuizId(Long quizId);

    boolean existsByQuizId(Long quizId);

    void deleteByQuizId(Long quizId);
}
