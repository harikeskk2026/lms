package com.careerlabs.lms.api.batch.controller;

import com.careerlabs.lms.api.batch.dto.request.EnrollStudentRequest;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.student.dto.response.StudentResponse;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.student.service.StudentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/batches")
public class AdminBatchController {

    private final BatchRepository batchRepository;
    private final StudentRepository studentRepository;
    private final StudentService studentService;

    public AdminBatchController(BatchRepository batchRepository, StudentRepository studentRepository,
                                 StudentService studentService) {
        this.batchRepository = batchRepository;
        this.studentRepository = studentRepository;
        this.studentService = studentService;
    }

    @PostMapping("/{batchId}/enroll")
    public ResponseEntity<ApiResponse<StudentResponse>> enrollStudent(@PathVariable Long batchId,
                                                                        @Valid @RequestBody EnrollStudentRequest request) {
        StudentResponse response = studentService.assignToBatch(request.studentId(), batchId);
        return ResponseEntity.ok(ApiResponse.of("Student enrolled", response));
    }

    @DeleteMapping("/{batchId}/students/{studentId}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> removeStudent(@PathVariable Long batchId, @PathVariable Long studentId) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + batchId));
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + studentId));

        if (student.getBatch() == null || !student.getBatch().getId().equals(batch.getId())) {
            throw new BadRequestException("Student is not enrolled in this batch");
        }

        student.setBatch(null);
        studentRepository.save(student);

        return ResponseEntity.ok(ApiResponse.of("Student removed from batch", null));
    }
}
