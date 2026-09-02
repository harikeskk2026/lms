package com.careerlabs.lms.api.quiz.repository;

import com.careerlabs.lms.api.quiz.entity.AchievementCode;
import com.careerlabs.lms.api.quiz.entity.StudentAchievement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StudentAchievementRepository extends JpaRepository<StudentAchievement, Long> {

    List<StudentAchievement> findByStudentId(Long studentId);

    boolean existsByStudentIdAndCode(Long studentId, AchievementCode code);
}
