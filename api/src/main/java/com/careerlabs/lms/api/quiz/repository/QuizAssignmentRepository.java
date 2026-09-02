package com.careerlabs.lms.api.quiz.repository;

import com.careerlabs.lms.api.quiz.entity.AssignmentTargetType;
import com.careerlabs.lms.api.quiz.entity.QuizAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuizAssignmentRepository extends JpaRepository<QuizAssignment, Long> {

    List<QuizAssignment> findByQuizId(Long quizId);

    boolean existsByQuizId(Long quizId);

    Optional<QuizAssignment> findByQuizIdAndTargetTypeAndTargetId(Long quizId, AssignmentTargetType targetType, Long targetId);

    void deleteByQuizId(Long quizId);
}
