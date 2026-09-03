package com.careerlabs.lms.api.placement.controller;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.placement.dto.request.StudentSkillRequest;
import com.careerlabs.lms.api.placement.dto.response.StudentSkillResponse;
import com.careerlabs.lms.api.placement.entity.StudentSkill;
import com.careerlabs.lms.api.placement.repository.StudentSkillRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/student/skills")
public class StudentSkillController {

    private final StudentSkillRepository skillRepository;
    private final StudentRepository studentRepository;

    public StudentSkillController(StudentSkillRepository skillRepository, StudentRepository studentRepository) {
        this.skillRepository = skillRepository;
        this.studentRepository = studentRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentSkillResponse>>> list(@AuthenticationPrincipal JwtUserPrincipal principal) {
        Student student = getStudent(principal.id());
        List<StudentSkill> skills = skillRepository.findByStudent_IdOrderByCreatedAtDesc(student.getId());
        return ResponseEntity.ok(ApiResponse.of(skills.stream().map(StudentSkillResponse::from).toList()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<StudentSkillResponse>> add(@Valid @RequestBody StudentSkillRequest request,
                                                                   @AuthenticationPrincipal JwtUserPrincipal principal) {
        Student student = getStudent(principal.id());
        StudentSkill s = new StudentSkill();
        s.setStudent(student);
        s.setSkillName(request.name());
        if (request.level() != null) s.setProficiencyLevel(request.level());
        if (request.category() != null) s.setCategory(request.category());

        return ResponseEntity.status(201).body(ApiResponse.of("Skill added", StudentSkillResponse.from(skillRepository.save(s))));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentSkillResponse>> update(@PathVariable Long id,
                                                                     @RequestBody StudentSkillRequest request,
                                                                     @AuthenticationPrincipal JwtUserPrincipal principal) {
        Student student = getStudent(principal.id());
        StudentSkill s = skillRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found: " + id));

        if (!s.getStudent().getId().equals(student.getId())) {
            throw new ResourceNotFoundException("Skill not found: " + id);
        }

        if (request.name() != null && !request.name().isBlank()) s.setSkillName(request.name());
        if (request.level() != null) s.setProficiencyLevel(request.level());
        if (request.category() != null) s.setCategory(request.category());

        return ResponseEntity.ok(ApiResponse.of("Skill updated", StudentSkillResponse.from(skillRepository.save(s))));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id,
                                                     @AuthenticationPrincipal JwtUserPrincipal principal) {
        Student student = getStudent(principal.id());
        StudentSkill s = skillRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found: " + id));

        if (s.getStudent().getId().equals(student.getId())) {
            skillRepository.delete(s);
        }
        return ResponseEntity.ok(ApiResponse.of("Skill deleted", null));
    }

    private Student getStudent(Long userId) {
        return studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
    }
}
