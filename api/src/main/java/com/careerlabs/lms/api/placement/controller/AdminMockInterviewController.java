package com.careerlabs.lms.api.placement.controller;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.placement.dto.request.CreateMockInterviewRequest;
import com.careerlabs.lms.api.placement.dto.request.UpdateMockInterviewRequest;
import com.careerlabs.lms.api.placement.dto.response.MockInterviewResponse;
import com.careerlabs.lms.api.placement.entity.MockInterview;
import com.careerlabs.lms.api.placement.entity.MockInterviewStatus;
import com.careerlabs.lms.api.placement.repository.MockInterviewRepository;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/admin/mock-interviews")
@Transactional
public class AdminMockInterviewController {

    private final MockInterviewRepository mockInterviewRepository;
    private final StudentRepository studentRepository;

    public AdminMockInterviewController(MockInterviewRepository mockInterviewRepository, StudentRepository studentRepository) {
        this.mockInterviewRepository = mockInterviewRepository;
        this.studentRepository = studentRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<MockInterviewResponse>>> list() {
        List<MockInterview> list = mockInterviewRepository.findAllByOrderByScheduledAtDesc();
        return ResponseEntity.ok(ApiResponse.of(list.stream().map(MockInterviewResponse::from).toList()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MockInterviewResponse>> create(@Valid @RequestBody CreateMockInterviewRequest request) {
        if (request.getScheduledAt() == null || request.getScheduledAt().isBlank()) {
            throw new BadRequestException("Scheduled date and time is required");
        }

        Instant scheduledAt = request.parseScheduledAt();
        if (scheduledAt == null) {
            throw new BadRequestException("Invalid date and time format");
        }

        // Allow 60 seconds grace period for network/processing delay
        if (scheduledAt.isBefore(Instant.now().minusSeconds(60))) {
            throw new BadRequestException("Mock interview cannot be scheduled in the past");
        }

        Student student = studentRepository.findWithUserById(request.getStudentId())
                .orElseGet(() -> studentRepository.findById(request.getStudentId())
                        .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + request.getStudentId())));

        MockInterview m = new MockInterview();
        m.setStudent(student);
        m.setScheduledAt(scheduledAt);
        m.setInterviewerName(request.getInterviewerName());
        m.setMeetLink(request.getMeetLink());
        m.setStatus(MockInterviewStatus.SCHEDULED);

        return ResponseEntity.status(201).body(ApiResponse.of("Mock interview scheduled", MockInterviewResponse.from(mockInterviewRepository.save(m))));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<MockInterviewResponse>> update(@PathVariable Long id, @RequestBody UpdateMockInterviewRequest request) {
        MockInterview m = mockInterviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mock interview not found: " + id));

        if (request.status() != null) m.setStatus(request.status());
        if (request.rating() != null) m.setRating(request.rating());
        if (request.feedback() != null) m.setFeedback(request.feedback());
        if (request.strengths() != null) m.setStrengths(String.join(", ", request.strengths()));
        if (request.improvements() != null) m.setImprovements(String.join(", ", request.improvements()));

        return ResponseEntity.ok(ApiResponse.of("Mock interview updated", MockInterviewResponse.from(mockInterviewRepository.save(m))));
    }
}
