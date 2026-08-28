package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.quiz.entity.QuestionAttempt;
import com.careerlabs.lms.api.quiz.entity.QuestionOption;
import com.careerlabs.lms.api.quiz.service.QuizScoringService;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.stream.Collectors;

@Service
public class QuizScoringServiceImpl implements QuizScoringService {

    @Override
    public void score(QuestionAttempt questionAttempt) {
        score(questionAttempt, false);
    }

    @Override
    public void score(QuestionAttempt questionAttempt, boolean negativeMarking) {
        Set<Long> correctOptionIds = questionAttempt.getQuestion().getOptions().stream()
                .filter(QuestionOption::isCorrect)
                .map(QuestionOption::getId)
                .collect(Collectors.toSet());

        Set<Long> selectedOptionIds = questionAttempt.getSelectedOptions().stream()
                .map(QuestionOption::getId)
                .collect(Collectors.toSet());

        boolean skipped = selectedOptionIds.isEmpty();
        boolean correct = !skipped && selectedOptionIds.equals(correctOptionIds);
        int maxPoints = questionAttempt.getMaxPoints() != null
                ? questionAttempt.getMaxPoints()
                : questionAttempt.getQuestion().getPoints();

        questionAttempt.setCorrect(correct);
        if (correct) {
            questionAttempt.setPointsEarned(maxPoints);
        } else if (negativeMarking && !skipped) {
            questionAttempt.setPointsEarned(-maxPoints);
        } else {
            questionAttempt.setPointsEarned(0);
        }
    }
}
