package com.careerlabs.lms.api.placement.controller;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.placement.dto.response.MockInterviewResponse;
import com.careerlabs.lms.api.placement.entity.MockInterview;
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
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/student")
@Transactional(readOnly = true)
public class StudentMockInterviewController {

    private final MockInterviewRepository mockInterviewRepository;
    private final StudentRepository studentRepository;

    public StudentMockInterviewController(MockInterviewRepository mockInterviewRepository, StudentRepository studentRepository) {
        this.mockInterviewRepository = mockInterviewRepository;
        this.studentRepository = studentRepository;
    }

    @GetMapping("/mock-interviews")
    public ResponseEntity<ApiResponse<List<MockInterviewResponse>>> list(@AuthenticationPrincipal JwtUserPrincipal principal) {
        Student student = studentRepository.findByUserId(principal.id())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
        List<MockInterview> list = mockInterviewRepository.findByStudent_IdOrderByScheduledAtDesc(student.getId());
        return ResponseEntity.ok(ApiResponse.of(list.stream().map(MockInterviewResponse::from).toList()));
    }

    @GetMapping("/mock-analytics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> analytics(@AuthenticationPrincipal JwtUserPrincipal principal) {
        Student student = studentRepository.findByUserId(principal.id())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
        List<MockInterview> list = mockInterviewRepository.findByStudent_IdOrderByScheduledAtDesc(student.getId());

        double avgRating = list.stream().filter(m -> m.getRating() != null).mapToInt(MockInterview::getRating).average().orElse(0.0);
        long completed = list.stream().filter(m -> m.getStatus() != null && m.getStatus().name().equals("COMPLETED")).count();

        Map<String, Object> map = new HashMap<>();
        map.put("totalMocks", list.size());
        map.put("completedMocks", completed);
        map.put("averageRating", Math.round(avgRating * 10.0) / 10.0);
        map.put("recentMocks", list.stream().limit(5).map(MockInterviewResponse::from).toList());

        return ResponseEntity.ok(ApiResponse.of(map));
    }
}
