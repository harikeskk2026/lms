package com.careerlabs.lms.api.placement.controller;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.placement.dto.response.AdminPlacementOverviewResponse;
import com.careerlabs.lms.api.placement.dto.response.AdminPlacementOverviewResponse.PlacementStudentItem;
import com.careerlabs.lms.api.placement.entity.MockInterview;
import com.careerlabs.lms.api.placement.repository.MockInterviewRepository;
import com.careerlabs.lms.api.student.entity.PlacementStatus;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin/placement")
public class AdminPlacementController {

    private final StudentRepository studentRepository;
    private final MockInterviewRepository mockInterviewRepository;

    public AdminPlacementController(StudentRepository studentRepository, MockInterviewRepository mockInterviewRepository) {
        this.studentRepository = studentRepository;
        this.mockInterviewRepository = mockInterviewRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<AdminPlacementOverviewResponse>> getOverview() {
        List<Student> students = studentRepository.findAll();
        List<MockInterview> allMocks = mockInterviewRepository.findAllByOrderByScheduledAtDesc();

        Map<Long, List<MockInterview>> mocksByStudent = new HashMap<>();
        for (MockInterview m : allMocks) {
            if (m.getStudent() != null) {
                mocksByStudent.computeIfAbsent(m.getStudent().getId(), k -> new ArrayList<>()).add(m);
            }
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

            List<MockInterview> sMocks = mocksByStudent.getOrDefault(s.getId(), List.of());
            long mockCount = sMocks.size();
            int avgRating = (int) Math.round(sMocks.stream().filter(m -> m.getRating() != null).mapToInt(MockInterview::getRating).average().orElse(0.0));

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
}
