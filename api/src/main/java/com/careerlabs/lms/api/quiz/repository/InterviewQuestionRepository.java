package com.careerlabs.lms.api.quiz.repository;

import com.careerlabs.lms.api.quiz.entity.InterviewQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface InterviewQuestionRepository
        extends JpaRepository<InterviewQuestion, Long>, JpaSpecificationExecutor<InterviewQuestion> {

    @Query("SELECT q.category, COUNT(q) FROM InterviewQuestion q WHERE q.active = true GROUP BY q.category ORDER BY q.category")
    List<Object[]> countActiveByCategory();

    boolean existsByQuestionTextIgnoreCase(String questionText);
}
