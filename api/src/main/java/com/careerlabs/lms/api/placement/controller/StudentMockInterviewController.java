package com.careerlabs.lms.api.placement.controller;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.placement.dto.response.MockInterviewResponse;
import com.careerlabs.lms.api.placement.entity.MockInterview;
import com.careerlabs.lms.api.placement.entity.MockInterviewCandidate;
import com.careerlabs.lms.api.placement.entity.MockInterviewCandidateStatus;
import com.careerlabs.lms.api.placement.repository.MockInterviewCandidateRepository;
import com.careerlabs.lms.api.placement.repository.MockInterviewRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/student")
@Transactional(readOnly = true)
public class StudentMockInterviewController {

    private final MockInterviewCandidateRepository candidateRepository;
    private final StudentRepository studentRepository;

    public StudentMockInterviewController(MockInterviewCandidateRepository candidateRepository,
                                          StudentRepository studentRepository) {
        this.candidateRepository = candidateRepository;
        this.studentRepository = studentRepository;
    }

    @GetMapping("/mock-interviews")
    public ResponseEntity<ApiResponse<List<MockInterviewResponse>>> list(@AuthenticationPrincipal JwtUserPrincipal principal) {
        Student student = studentRepository.findByUserId(principal.id())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        List<MockInterviewCandidate> candidates = candidateRepository.findByStudent_IdOrderByMockInterviewScheduledAtDesc(student.getId());
        LinkedHashSet<MockInterview> mocks = new LinkedHashSet<>();
        for (MockInterviewCandidate c : candidates) {
            mocks.add(c.getMockInterview());
        }

        return ResponseEntity.ok(ApiResponse.of(mocks.stream()
                .map(m -> MockInterviewResponse.forStudent(m, student.getId()))
                .toList()));
    }

    @GetMapping("/mock-analytics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> analytics(@AuthenticationPrincipal JwtUserPrincipal principal) {
        Student student = studentRepository.findByUserId(principal.id())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        List<MockInterviewCandidate> candidates = candidateRepository.findByStudent_IdOrderByMockInterviewScheduledAtDesc(student.getId());

        double avgRating = candidates.stream().filter(c -> c.getRating() != null).mapToInt(MockInterviewCandidate::getRating).average().orElse(0.0);
        long completed = candidates.stream().filter(c -> c.getStatus() == MockInterviewCandidateStatus.COMPLETED).count();

        LinkedHashSet<MockInterview> mockSet = new LinkedHashSet<>();
        for (MockInterviewCandidate c : candidates) {
            mockSet.add(c.getMockInterview());
        }

        Map<String, Object> map = new HashMap<>();
        map.put("totalMocks", candidates.size());
        map.put("completedMocks", completed);
        map.put("averageRating", Math.round(avgRating * 10.0) / 10.0);
        map.put("recentMocks", mockSet.stream().limit(5)
                .map(m -> MockInterviewResponse.forStudent(m, student.getId()))
                .toList());

        return ResponseEntity.ok(ApiResponse.of(map));
    }
}