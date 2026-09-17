package com.careerlabs.lms.api.quiz.repository;

import com.careerlabs.lms.api.quiz.entity.InterviewQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InterviewQuestionRepository
        extends JpaRepository<InterviewQuestion, Long>, JpaSpecificationExecutor<InterviewQuestion> {

    @Query("SELECT q.category, COUNT(q) FROM InterviewQuestion q WHERE q.active = true AND (q.course IS NULL OR (q.course IS NOT NULL AND q.course.id = :courseId)) GROUP BY q.category ORDER BY q.category")
    List<Object[]> countActiveByCategory(@Param("courseId") Long courseId);

    long countByCategoryAndActiveTrue(String category);

    boolean existsByQuestionTextIgnoreCase(String questionText);

    /** Shared platform content - reassign attribution rather than delete it when its author is removed. */
    @Modifying
    @Query("UPDATE InterviewQuestion q SET q.createdBy = :toUserId WHERE q.createdBy = :fromUserId")
    void reassignCreatedBy(@Param("fromUserId") Long fromUserId, @Param("toUserId") Long toUserId);
}
