package com.careerlabs.lms.api.session.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.common.dto.request.ReorderRequest;
import com.careerlabs.lms.api.session.dto.request.SessionRequest;
import com.careerlabs.lms.api.session.dto.response.SessionResponse;
import com.careerlabs.lms.api.session.service.SessionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @GetMapping("/api/topics/{topicId}/sessions")
    public ResponseEntity<ApiResponse<List<SessionResponse>>> list(@PathVariable Long topicId,
                                                                      @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(sessionService.list(topicId, principal)));
    }

    @PostMapping("/api/topics/{topicId}/sessions")
    public ResponseEntity<ApiResponse<SessionResponse>> create(@PathVariable Long topicId,
                                                                  @Valid @RequestBody SessionRequest request) {
        SessionResponse response = sessionService.create(topicId, request);
        return ResponseEntity.status(201).body(ApiResponse.of("Session created", response));
    }

    @PutMapping("/api/topics/{topicId}/sessions/reorder")
    public ResponseEntity<ApiResponse<List<SessionResponse>>> reorder(@PathVariable Long topicId,
                                                                         @Valid @RequestBody ReorderRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Sessions reordered", sessionService.reorder(topicId, request)));
    }

    @PutMapping("/api/sessions/{id}")
    public ResponseEntity<ApiResponse<SessionResponse>> update(@PathVariable Long id,
                                                                  @Valid @RequestBody SessionRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Session updated", sessionService.update(id, request)));
    }

    @DeleteMapping("/api/sessions/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        sessionService.delete(id);
        return ResponseEntity.ok(ApiResponse.of("Session deleted", null));
    }
}
