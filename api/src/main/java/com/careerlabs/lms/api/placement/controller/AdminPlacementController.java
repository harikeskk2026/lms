package com.careerlabs.lms.api.placement.controller;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.placement.dto.request.CreatePlacementRequest;
import com.careerlabs.lms.api.placement.dto.response.AdminPlacementOverviewResponse;
import com.careerlabs.lms.api.placement.dto.response.AdminPlacementOverviewResponse.PlacementStudentItem;
import com.careerlabs.lms.api.placement.dto.response.PlacementResponse;
import com.careerlabs.lms.api.placement.entity.MockInterviewCandidate;
import com.careerlabs.lms.api.placement.repository.MockInterviewCandidateRepository;
import com.careerlabs.lms.api.placement.service.PlacementService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.entity.PlacementStatus;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin/placement")
public class AdminPlacementController {

    private final StudentRepository studentRepository;
    private final MockInterviewCandidateRepository mockCandidateRepository;
    private final PlacementService placementService;

    public AdminPlacementController(StudentRepository studentRepository,
                                    MockInterviewCandidateRepository mockCandidateRepository,
                                    PlacementService placementService) {
        this.studentRepository = studentRepository;
        this.mockCandidateRepository = mockCandidateRepository;
        this.placementService = placementService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<AdminPlacementOverviewResponse>> getOverview() {
        List<Student> students = studentRepository.findAll();
        Map<Long, Long> mockCountsByStudent = new HashMap<>();
        for (Student s : students) {
            mockCountsByStudent.put(s.getId(), mockCandidateRepository.countByStudent_Id(s.getId()));
        }

        Map<String, Long> statusCounts = new HashMap<>();
        statusCounts.put("SEEKING", 0L);
        statusCounts.put("INTERVIEWING", 0L);
        statusCounts.put("PLACED", 0L);
        statusCounts.put("NOT_SEEKING", 0L);

        List<PlacementStudentItem> items = new ArrayList<>();
        for (Student s : students) {
            PlacementStatus status = s.getPlacementStatus() != null ? s.getPlacementStatus() : PlacementStatus.SEEKING;
            statusCounts.put(status.name(), statusCounts.getOrDefault(status.name(), 0L) + 1);

            double mockRating = mockCandidateRepository.findByStudent_IdOrderByMockInterviewScheduledAtDesc(s.getId())
                    .stream().filter(c -> c.getRating() != null)
                    .mapToInt(MockInterviewCandidate::getRating).average().orElse(0.0);
            long mockCount = mockCountsByStudent.getOrDefault(s.getId(), 0L);
            int avgRating = (int) Math.round(mockRating);

            items.add(new PlacementStudentItem(
                    s.getId(),
                    s.getUser() != null ? s.getUser().getName() : "Student #" + s.getId(),
                    s.getUser() != null ? s.getUser().getEmail() : "",
                    s.getPhone(),
                    status,
                    mockCount,
                    avgRating,
                    s.getUpdatedAt() != null ? s.getUpdatedAt().toString() : ""
            ));
        }

        long total = students.size();
        long placed = statusCounts.getOrDefault("PLACED", 0L);
        int conversionRate = total > 0 ? (int) Math.round((double) placed * 100 / total) : 0;

        return ResponseEntity.ok(ApiResponse.of(new AdminPlacementOverviewResponse(statusCounts, conversionRate, items)));
    }

    @PatchMapping("/{studentId}/status")
    public ResponseEntity<ApiResponse<Void>> updateStatus(@PathVariable Long studentId, @RequestBody Map<String, String> body) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + studentId));
        String statusStr = body.get("status");
        if (statusStr != null) {
            student.setPlacementStatus(PlacementStatus.valueOf(statusStr.toUpperCase()));
            studentRepository.save(student);
        }
        return ResponseEntity.ok(ApiResponse.of("Placement status updated", null));
    }

    @GetMapping("/placements")
    public ResponseEntity<ApiResponse<List<PlacementResponse>>> listPlacements() {
        return ResponseEntity.ok(ApiResponse.of(placementService.listAll()));
    }

    @PostMapping("/placements")
    public ResponseEntity<ApiResponse<PlacementResponse>> recordPlacement(
            @Valid @RequestBody CreatePlacementRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of("Placement recorded", placementService.record(request, principal.id())));
    }
}
