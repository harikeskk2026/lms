package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.quiz.dto.response.AchievementResponse;
import com.careerlabs.lms.api.quiz.entity.AchievementCode;
import com.careerlabs.lms.api.quiz.entity.StudentAchievement;
import com.careerlabs.lms.api.quiz.repository.StudentAchievementRepository;
import com.careerlabs.lms.api.quiz.service.AchievementService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AchievementServiceImpl implements AchievementService {

    private final StudentAchievementRepository studentAchievementRepository;

    public AchievementServiceImpl(StudentAchievementRepository studentAchievementRepository) {
        this.studentAchievementRepository = studentAchievementRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AchievementResponse> listMine(Long studentId) {
        Map<AchievementCode, Instant> unlocked = studentAchievementRepository.findByStudentId(studentId).stream()
                .collect(Collectors.toMap(StudentAchievement::getCode, StudentAchievement::getUnlockedAt));

        return Arrays.stream(AchievementCode.values())
                .map(code -> new AchievementResponse(
                        code.name(),
                        code.getDisplayName(),
                        code.getDescription(),
                        code.getXpReward(),
                        unlocked.containsKey(code),
                        unlocked.get(code)))
                .toList();
    }
}
