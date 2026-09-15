package com.careerlabs.lms.api.assignment.service;

import com.careerlabs.lms.api.assignment.dto.request.AssignmentRequest;
import com.careerlabs.lms.api.assignment.dto.response.AssignmentPageResponse;
import com.careerlabs.lms.api.assignment.dto.response.AssignmentResponse;
import com.careerlabs.lms.api.assignment.dto.response.StudentAssignmentResponse;
import com.careerlabs.lms.api.assignment.dto.response.UploadResponse;
import com.careerlabs.lms.api.assignment.entity.AssignmentStatus;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

public interface AssignmentService {

    AssignmentPageResponse list(String search, Long courseId, Long batchId, AssignmentStatus status,
            LocalDate dueDateFrom, LocalDate dueDateTo, int page, int limit, JwtUserPrincipal principal);

    default AssignmentPageResponse list(String search, Long courseId, Long batchId, AssignmentStatus status,
            LocalDate dueDateFrom, LocalDate dueDateTo, int page, int limit) {
        return list(search, courseId, batchId, status, dueDateFrom, dueDateTo, page, limit, null);
    }

    List<StudentAssignmentResponse> listForStudent(Long userId);

    AssignmentResponse get(Long id, JwtUserPrincipal principal);
    default AssignmentResponse get(Long id) { return get(id, null); }

    AssignmentResponse create(AssignmentRequest request, JwtUserPrincipal principal);
    default AssignmentResponse create(AssignmentRequest request) { return create(request, null); }

    AssignmentResponse update(Long id, AssignmentRequest request, JwtUserPrincipal principal);
    default AssignmentResponse update(Long id, AssignmentRequest request) { return update(id, request, null); }

    void delete(Long id, JwtUserPrincipal principal);
    default void delete(Long id) { delete(id, null); }

    AssignmentResponse publish(Long id, JwtUserPrincipal principal);
    default AssignmentResponse publish(Long id) { return publish(id, null); }

    AssignmentResponse close(Long id, JwtUserPrincipal principal);
    default AssignmentResponse close(Long id) { return close(id, null); }

    AssignmentResponse reopen(Long id, JwtUserPrincipal principal);
    default AssignmentResponse reopen(Long id) { return reopen(id, null); }

    UploadResponse uploadAttachment(MultipartFile file);
}
