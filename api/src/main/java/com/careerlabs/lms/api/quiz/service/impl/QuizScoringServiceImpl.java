package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.quiz.entity.AnswerMode;
import com.careerlabs.lms.api.quiz.entity.Question;
import com.careerlabs.lms.api.quiz.entity.QuestionAttempt;
import com.careerlabs.lms.api.quiz.entity.QuestionOption;
import com.careerlabs.lms.api.quiz.entity.QuestionType;
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
        Question question = questionAttempt.getQuestion();
        if (question.getAnswerMode() == AnswerMode.FREE_TEXT) {
            scoreFreeText(questionAttempt, question, negativeMarking);
            return;
        }

        // ---- OPTIONS-mode logic — unchanged for MCQ/MULTIPLE_CORRECT/TRUE_FALSE
        // and legacy options-based CODE_OUTPUT/DEBUGGING/SCENARIO/SQL/INTERVIEW ----
        Set<Long> correctOptionIds = question.getOptions().stream()
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
                : question.getPoints();

        questionAttempt.setCorrect(correct);
        if (correct) {
            questionAttempt.setPointsEarned(maxPoints);
        } else if (negativeMarking && !skipped) {
            questionAttempt.setPointsEarned(-maxPoints);
        } else {
            questionAttempt.setPointsEarned(0);
        }
    }

    /**
     * FREE_TEXT questions (Short Answer/Coding/SQL). Coding/SQL are captured but
     * never graded (no sandboxed execution exists) — {@code correct} stays null
     * ("not applicable") and 0 points are awarded regardless of content. Short
     * Answer is auto-graded via a normalized (trim/lowercase/collapse-whitespace)
     * text comparison, mirroring the OPTIONS-mode skip/negative-marking shape above.
     */
    private void scoreFreeText(QuestionAttempt questionAttempt, Question question, boolean negativeMarking) {
        int maxPoints = questionAttempt.getMaxPoints() != null
                ? questionAttempt.getMaxPoints()
                : question.getPoints();

        if (question.getQuestionType() == QuestionType.SQL) {
            // Defensive: SQL is no longer authored as FREE_TEXT going forward
            // (Coding/SQL free-text authoring was dropped), but any question
            // saved as FREE_TEXT SQL before that change stays ungraded rather
            // than being scored against a nonexistent answer key.
            questionAttempt.setCorrect(null);
            questionAttempt.setPointsEarned(0);
            return;
        }

        String given = questionAttempt.getAnswerText();
        boolean skipped = given == null || given.isBlank();
        boolean correct = !skipped && normalize(given).equals(normalize(question.getCorrectAnswerText()));

        questionAttempt.setCorrect(skipped ? false : correct);
        if (correct) {
            questionAttempt.setPointsEarned(maxPoints);
        } else if (negativeMarking && !skipped) {
            questionAttempt.setPointsEarned(-maxPoints);
        } else {
            questionAttempt.setPointsEarned(0);
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.strip().toLowerCase().replaceAll("\\s+", " ");
    }
}
