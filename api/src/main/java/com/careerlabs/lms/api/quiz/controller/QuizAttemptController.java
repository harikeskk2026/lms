package com.careerlabs.lms.api.quiz.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.quiz.dto.request.SubmitAnswerRequest;
import com.careerlabs.lms.api.quiz.dto.response.InterviewSimulationResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuizAttemptResponse;
import com.careerlabs.lms.api.quiz.dto.response.QuizResultResponse;
import com.careerlabs.lms.api.quiz.dto.response.StudentQuestionResponse;
import com.careerlabs.lms.api.quiz.service.AdaptiveQuizService;
import com.careerlabs.lms.api.quiz.service.InterviewSimulationService;
import com.careerlabs.lms.api.quiz.service.QuizAttemptService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * In-progress and completed attempt handling. The backend is the sole source of
 * truth for scoring — {@link SubmitAnswerRequest} never carries a score or a
 * correctness flag, and {@code submit} always recomputes everything server-side.
 */
@RestController
@RequestMapping("/api/student/quiz-attempts")
public class QuizAttemptController {

    private final QuizAttemptService quizAttemptService;
    private final InterviewSimulationService interviewSimulationService;
    private final AdaptiveQuizService adaptiveQuizService;

    public QuizAttemptController(QuizAttemptService quizAttemptService,
                                  InterviewSimulationService interviewSimulationService,
                                  AdaptiveQuizService adaptiveQuizService) {
        this.quizAttemptService = quizAttemptService;
        this.interviewSimulationService = interviewSimulationService;
        this.adaptiveQuizService = adaptiveQuizService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<QuizAttemptResponse>>> listMine(@AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(quizAttemptService.listMine(principal.id())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<QuizResultResponse>> get(@PathVariable Long id,
                                                                 @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(quizAttemptService.get(id, principal.id())));
    }

    @PostMapping("/{id}/answers")
    public ResponseEntity<ApiResponse<Void>> saveAnswer(@PathVariable Long id,
                                                          @Valid @RequestBody SubmitAnswerRequest request,
                                                          @AuthenticationPrincipal JwtUserPrincipal principal) {
        quizAttemptService.saveAnswer(id, principal.id(), request);
        return ResponseEntity.ok(ApiResponse.of("Answer saved", null));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<ApiResponse<QuizResultResponse>> submit(@PathVariable Long id,
                                                                    @AuthenticationPrincipal JwtUserPrincipal principal) {
        QuizResultResponse response = quizAttemptService.submit(id, principal.id());
        return ResponseEntity.ok(ApiResponse.of("Quiz submitted", response));
    }

    /**
     * Called when the student exits/closes the quiz before submitting - either an
     * explicit exit click, or a keepalive fetch fired from a pagehide/beforeunload
     * listener when the tab closes. Idempotent (see {@link QuizAttemptService#abandon}),
     * so it's safe even if it races with a real submit.
     */
    @PostMapping("/{id}/abandon")
    public ResponseEntity<ApiResponse<Void>> abandon(@PathVariable Long id,
                                                       @AuthenticationPrincipal JwtUserPrincipal principal) {
        quizAttemptService.abandon(id, principal.id());
        return ResponseEntity.ok(ApiResponse.of("Attempt closed", null));
    }

    @GetMapping("/{id}/interview-simulation")
    public ResponseEntity<ApiResponse<InterviewSimulationResponse>> getInterviewSimulation(
            @PathVariable Long id, @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(interviewSimulationService.getResult(id, principal.id())));
    }

    @PostMapping("/{id}/next")
    public ResponseEntity<ApiResponse<StudentQuestionResponse>> nextAdaptiveQuestion(
            @PathVariable Long id, @AuthenticationPrincipal JwtUserPrincipal principal) {
        StudentQuestionResponse next = adaptiveQuizService.next(id, principal.id());
        return ResponseEntity.ok(ApiResponse.of(next));
    }
}
