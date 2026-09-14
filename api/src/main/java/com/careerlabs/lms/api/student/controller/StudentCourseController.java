package com.careerlabs.lms.api.student.controller;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.material.dto.response.MaterialResponse;
import com.careerlabs.lms.api.material.service.MaterialService;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/student/courses")
public class StudentCourseController {

    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final SyllabusModuleRepository moduleRepository;
    private final SyllabusTopicRepository topicRepository;
    private final CourseAccessGuard accessGuard;
    private final MaterialService materialService;

    public StudentCourseController(StudentRepository studentRepository,
                                   EnrollmentRepository enrollmentRepository,
                                   SyllabusModuleRepository moduleRepository,
                                   SyllabusTopicRepository topicRepository,
                                   CourseAccessGuard accessGuard,
                                   MaterialService materialService) {
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.moduleRepository = moduleRepository;
        this.topicRepository = topicRepository;
        this.accessGuard = accessGuard;
        this.materialService = materialService;
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentCourseResponse>>> getMyCourses(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.ok(ApiResponse.of(List.of()));
        }

        Student student = studentRepository.findByUserId(principal.id()).orElse(null);
        if (student == null) {
            return ResponseEntity.ok(ApiResponse.of(List.of()));
        }

        List<com.careerlabs.lms.api.enrollment.entity.Enrollment> enrollments =
                enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(student.getId());
        if (enrollments.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.of(List.of()));
        }

        List<StudentCourseResponse> responses = new java.util.ArrayList<>();
        for (com.careerlabs.lms.api.enrollment.entity.Enrollment enrollment : enrollments) {
            Course course = enrollment.getCourse();
            if (course == null || !accessGuard.isReadableCourseStatus(course.getStatus())) {
                continue;
            }
            Batch batch = enrollment.getBatch();
            List<SyllabusModule> modules = moduleRepository.findAllByCourseIdOrderByOrderIndexAsc(course.getId());
            List<Long> moduleIds = modules.stream().map(SyllabusModule::getId).toList();
            int totalTopics = moduleIds.isEmpty() ? 0 : topicRepository.findAllByModuleIdInOrderByOrderIndexAsc(moduleIds).size();
            int completedTopics = 0;

            responses.add(StudentCourseResponse.of(batch, course, completedTopics, totalTopics));
        }

        return ResponseEntity.ok(ApiResponse.of(responses));
    }

    @GetMapping("/{id}/materials")
    public ResponseEntity<ApiResponse<List<MaterialResponse>>> getCourseMaterials(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(materialService.listAllForCourse(id, principal)));
    }
}
