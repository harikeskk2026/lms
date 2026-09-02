package com.careerlabs.lms.api.quiz.service;

import com.careerlabs.lms.api.quiz.dto.response.AchievementResponse;

import java.util.List;

public interface AchievementService {

    /** The full fixed catalog, each row flagged with whether this student has unlocked it. */
    List<AchievementResponse> listMine(Long studentId);
}
