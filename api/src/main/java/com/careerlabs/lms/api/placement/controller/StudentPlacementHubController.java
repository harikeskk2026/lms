package com.careerlabs.lms.api.placement.controller;

import com.careerlabs.lms.api.academic.entity.AcademicDetails;
import com.careerlabs.lms.api.academic.repository.AcademicDetailsRepository;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.placement.repository.DriveApplicationRepository;
import com.careerlabs.lms.api.placement.repository.DriveRepository;
import com.careerlabs.lms.api.placement.repository.MockInterviewRepository;
import com.careerlabs.lms.api.placement.repository.StudentSkillRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/student/placement")
@Transactional(readOnly = true)
public class StudentPlacementHubController {

    private final StudentRepository studentRepository;
    private final AcademicDetailsRepository academicDetailsRepository;
    private final DriveRepository driveRepository;
    private final DriveApplicationRepository driveApplicationRepository;
    private final MockInterviewRepository mockInterviewRepository;
    private final StudentSkillRepository skillRepository;

    public StudentPlacementHubController(StudentRepository studentRepository,
                                          AcademicDetailsRepository academicDetailsRepository,
                                          DriveRepository driveRepository,
                                          DriveApplicationRepository driveApplicationRepository,
                                          MockInterviewRepository mockInterviewRepository,
                                          StudentSkillRepository skillRepository) {
        this.studentRepository = studentRepository;
        this.academicDetailsRepository = academicDetailsRepository;
        this.driveRepository = driveRepository;
        this.driveApplicationRepository = driveApplicationRepository;
        this.mockInterviewRepository = mockInterviewRepository;
        this.skillRepository = skillRepository;
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
        long mockCount = mockInterviewRepository.countByStudent_Id(student.getId());
        int skillCount = skillRepository.findByStudent_IdOrderByCreatedAtDesc(student.getId()).size();

        Map<String, Object> profileMap = new HashMap<>();
        profileMap.put("phone", student.getPhone());
        profileMap.put("address", student.getAddress());
        profileMap.put("qualification", student.getQualification());
        profileMap.put("linkedinUrl", student.getLinkedinUrl());
        profileMap.put("githubUrl", student.getGithubUrl());
        profileMap.put("resumeUrl", student.getResumeUrl());
        profileMap.put("placementStatus", student.getPlacementStatus());
        profileMap.put("enrollmentNo", student.getEnrollmentNo());

        if (academic != null) {
            profileMap.put("ugScore", academic.getUgScore());
            profileMap.put("ugScoreType", academic.getUgScoreType());
            profileMap.put("ugBacklogs", academic.getUgBacklogs());
        }

        int readinessScore = 40;
        if (student.getResumeUrl() != null && !student.getResumeUrl().isBlank()) readinessScore += 25;
        if (skillCount > 0) readinessScore += 20;
        if (academic != null && academic.getUgScore() != null) readinessScore += 15;
        readinessScore = Math.min(100, readinessScore);

        Map<String, Object> res = new HashMap<>();
        res.put("studentId", student.getId());
        res.put("studentName", student.getUser() != null ? student.getUser().getName() : "");
        res.put("email", student.getUser() != null ? student.getUser().getEmail() : "");
        res.put("batchName", student.getBatch() != null ? student.getBatch().getName() : null);
        res.put("collegeName", student.getCollege() != null ? student.getCollege().getName() : null);
        res.put("courseName", student.getCourse() != null ? student.getCourse().getTitle() : null);
        res.put("readinessScore", readinessScore);
        res.put("totalDrives", totalDrives);
        res.put("appliedDrives", appliedDrives);
        res.put("mockCount", mockCount);
        res.put("skillCount", skillCount);
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
