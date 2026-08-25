package com.careerlabs.lms.api.assignment.service;

import com.careerlabs.lms.api.assignment.dto.request.AssignmentRequest;
import com.careerlabs.lms.api.assignment.dto.response.AssignmentPageResponse;
import com.careerlabs.lms.api.assignment.dto.response.AssignmentResponse;
import com.careerlabs.lms.api.assignment.dto.response.UploadResponse;
import com.careerlabs.lms.api.assignment.entity.AssignmentStatus;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;

public interface AssignmentService {

    AssignmentPageResponse list(String search, Long courseId, Long batchId, AssignmentStatus status,
                                 LocalDate dueDateFrom, LocalDate dueDateTo, int page, int limit);

    AssignmentResponse get(Long id);

    AssignmentResponse create(AssignmentRequest request);

    AssignmentResponse update(Long id, AssignmentRequest request);

    void delete(Long id);

    AssignmentResponse publish(Long id);

    AssignmentResponse close(Long id);

    UploadResponse uploadAttachment(MultipartFile file);
}
