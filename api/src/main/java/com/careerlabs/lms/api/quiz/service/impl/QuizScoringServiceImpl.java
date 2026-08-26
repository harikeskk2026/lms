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
        Set<Long> correctOptionIds = questionAttempt.getQuestion().getOptions().stream()
                .filter(QuestionOption::isCorrect)
                .map(QuestionOption::getId)
                .collect(Collectors.toSet());

        Set<Long> selectedOptionIds = questionAttempt.getSelectedOptions().stream()
                .map(QuestionOption::getId)
                .collect(Collectors.toSet());

        boolean correct = !selectedOptionIds.isEmpty() && selectedOptionIds.equals(correctOptionIds);

        questionAttempt.setCorrect(correct);
        questionAttempt.setPointsEarned(correct ? questionAttempt.getQuestion().getPoints() : 0);
    }
}
