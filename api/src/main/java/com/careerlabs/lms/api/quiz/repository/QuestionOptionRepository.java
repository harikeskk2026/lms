package com.careerlabs.lms.api.quiz.repository;

import com.careerlabs.lms.api.quiz.entity.QuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuestionOptionRepository extends JpaRepository<QuestionOption, Long> {

    List<QuestionOption> findByQuestionIdOrderByOrderIndexAsc(Long questionId);
}
