package com.careerlabs.lms.api.student.controller;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.dto.response.StudentCourseResponse;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.syllabus.entity.SyllabusModule;
import com.careerlabs.lms.api.syllabus.repository.SyllabusModuleRepository;
import com.careerlabs.lms.api.syllabus.repository.SyllabusTopicRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/student/courses")
public class StudentCourseController {

    private final StudentRepository studentRepository;
    private final SyllabusModuleRepository moduleRepository;
    private final SyllabusTopicRepository topicRepository;

    public StudentCourseController(StudentRepository studentRepository,
                                   SyllabusModuleRepository moduleRepository,
                                   SyllabusTopicRepository topicRepository) {
        this.studentRepository = studentRepository;
        this.moduleRepository = moduleRepository;
        this.topicRepository = topicRepository;
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentCourseResponse>>> getMyCourses(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.ok(ApiResponse.of(List.of()));
        }

        Student student = studentRepository.findByUserId(principal.id()).orElse(null);
        if (student == null || student.getBatch() == null || student.getBatch().getCourse() == null) {
            return ResponseEntity.ok(ApiResponse.of(List.of()));
        }

        Batch batch = student.getBatch();
        Course course = batch.getCourse();

        List<SyllabusModule> modules = moduleRepository.findAllByCourseIdOrderByOrderIndexAsc(course.getId());
        List<Long> moduleIds = modules.stream().map(SyllabusModule::getId).toList();
        int totalTopics = moduleIds.isEmpty() ? 0 : topicRepository.findAllByModuleIdInOrderByOrderIndexAsc(moduleIds).size();
        int completedTopics = 0;

        StudentCourseResponse response = StudentCourseResponse.of(batch, course, completedTopics, totalTopics);
        return ResponseEntity.ok(ApiResponse.of(List.of(response)));
    }
}
