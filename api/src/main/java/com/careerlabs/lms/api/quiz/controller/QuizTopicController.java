package com.careerlabs.lms.api.quiz.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.quiz.dto.request.CreateQuizTopicRequest;
import com.careerlabs.lms.api.quiz.dto.response.QuizTopicResponse;
import com.careerlabs.lms.api.quiz.service.QuizTopicService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/quiz-topics")
public class QuizTopicController {

    private final QuizTopicService quizTopicService;

    public QuizTopicController(QuizTopicService quizTopicService) {
        this.quizTopicService = quizTopicService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<QuizTopicResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.of(quizTopicService.list()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<QuizTopicResponse>> create(@Valid @RequestBody CreateQuizTopicRequest request) {
        QuizTopicResponse response = quizTopicService.create(request);
        return ResponseEntity.status(201).body(ApiResponse.of("Topic created", response));
    }
}
