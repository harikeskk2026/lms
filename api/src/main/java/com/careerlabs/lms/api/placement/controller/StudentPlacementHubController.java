package com.careerlabs.lms.api.placement.controller;

import com.careerlabs.lms.api.academic.entity.AcademicDetails;
import com.careerlabs.lms.api.academic.repository.AcademicDetailsRepository;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.placement.repository.DriveApplicationRepository;
import com.careerlabs.lms.api.placement.repository.DriveRepository;
import com.careerlabs.lms.api.placement.repository.MockInterviewCandidateRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/student/placement")
@Transactional(readOnly = true)
public class StudentPlacementHubController {

    private final StudentRepository studentRepository;
    private final AcademicDetailsRepository academicDetailsRepository;
    private final DriveRepository driveRepository;
    private final DriveApplicationRepository driveApplicationRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final MockInterviewCandidateRepository mockCandidateRepository;

    public StudentPlacementHubController(StudentRepository studentRepository,
                                          AcademicDetailsRepository academicDetailsRepository,
                                          DriveRepository driveRepository,
                                          DriveApplicationRepository driveApplicationRepository,
                                          EnrollmentRepository enrollmentRepository,
                                          MockInterviewCandidateRepository mockCandidateRepository) {
        this.studentRepository = studentRepository;
        this.academicDetailsRepository = academicDetailsRepository;
        this.driveRepository = driveRepository;
        this.driveApplicationRepository = driveApplicationRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.mockCandidateRepository = mockCandidateRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPlacementOverview(@AuthenticationPrincipal JwtUserPrincipal principal) {
        return getHubData(principal);
    }

    @GetMapping("/hub")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getHubData(@AuthenticationPrincipal JwtUserPrincipal principal) {
        Student student = studentRepository.findByUserId(principal.id())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        AcademicDetails academic = academicDetailsRepository.findByStudentId(student.getId()).orElse(null);
        long totalDrives = driveRepository.count();
        long appliedDrives = driveApplicationRepository.countByStudent_Id(student.getId());
        long mockCount = mockCandidateRepository.countByStudent_Id(student.getId());

        Map<String, Object> profileMap = new HashMap<>();
        profileMap.put("enrollmentNo", student.getEnrollmentNo());
        profileMap.put("phone", student.getPhone());
        profileMap.put("address", student.getAddress());
        profileMap.put("qualification", student.getQualification());
        profileMap.put("placementStatus", student.getPlacementStatus());
        profileMap.put("linkedinUrl", student.getLinkedinUrl());
        profileMap.put("githubUrl", student.getGithubUrl());
        profileMap.put("resumeUrl", student.getResumeUrl());

        if (academic != null) {
            profileMap.put("collegeName", student.getCollege() != null ? student.getCollege().getName() : null);
            profileMap.put("degree", academic.getUgDegree());
            profileMap.put("branch", academic.getUgDepartment());
            profileMap.put("graduationYear", academic.getUgYearOfPassing());
            profileMap.put("tenthPercentage", academic.getTenthPercentage());
            profileMap.put("twelfthPercentage", academic.getTwelfthPercentage());
            profileMap.put("ugScore", academic.getUgScore());
            profileMap.put("ugScoreType", academic.getUgScoreType());
            profileMap.put("ugBacklogs", academic.getUgBacklogs());
        }

        int readinessScore = 40;
        if (student.getResumeUrl() != null && !student.getResumeUrl().isBlank()) readinessScore += 35;
        if (academic != null && academic.getUgScore() != null) readinessScore += 25;
        readinessScore = Math.min(100, readinessScore);

        List<Batch> activeBatches = enrollmentRepository.findActiveBatchesByStudentId(student.getId());
        String batchNamesStr = activeBatches.stream().map(Batch::getName).collect(java.util.stream.Collectors.joining(", "));
        List<String> batchNamesList = activeBatches.stream().map(Batch::getName).toList();

        Map<String, Object> res = new HashMap<>();
        res.put("studentId", student.getId());
        res.put("studentName", student.getUser() != null ? student.getUser().getName() : "");
        res.put("email", student.getUser() != null ? student.getUser().getEmail() : "");
        res.put("batchName", batchNamesStr.isEmpty() ? null : batchNamesStr);
        res.put("batchNames", batchNamesList);
        res.put("collegeName", student.getCollege() != null ? student.getCollege().getName() : null);
        res.put("courseName", student.getCourse() != null ? student.getCourse().getTitle() : null);
        res.put("readinessScore", readinessScore);
        res.put("totalDrives", totalDrives);
        res.put("appliedDrives", appliedDrives);
        res.put("mockCount", mockCount);
        res.put("profile", profileMap);

        return ResponseEntity.ok(ApiResponse.of(res));
    }

    @PatchMapping("/profile")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateProfile(@RequestBody Map<String, Object> body,
                                                                           @AuthenticationPrincipal JwtUserPrincipal principal) {
        Student student = studentRepository.findByUserId(principal.id())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        if (body.containsKey("phone")) student.setPhone((String) body.get("phone"));
        if (body.containsKey("address")) student.setAddress((String) body.get("address"));
        if (body.containsKey("qualification")) student.setQualification((String) body.get("qualification"));
        if (body.containsKey("linkedinUrl")) student.setLinkedinUrl((String) body.get("linkedinUrl"));
        if (body.containsKey("githubUrl")) student.setGithubUrl((String) body.get("githubUrl"));
        if (body.containsKey("placementStatus") && body.get("placementStatus") != null) {
            student.setPlacementStatus(com.careerlabs.lms.api.student.entity.PlacementStatus.valueOf(((String) body.get("placementStatus")).toUpperCase()));
        }
        studentRepository.save(student);

        return getHubData(principal);
    }
}
