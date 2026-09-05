package com.careerlabs.lms.api.student.service;

import com.careerlabs.lms.api.student.dto.request.StudentCreateRequest;
import com.careerlabs.lms.api.student.dto.request.StudentUpdateRequest;
import com.careerlabs.lms.api.student.dto.response.StudentCountResponse;
import com.careerlabs.lms.api.student.dto.response.StudentPageResponse;
import com.careerlabs.lms.api.student.dto.response.StudentResponse;
import com.careerlabs.lms.api.student.entity.PlacementStatus;

import com.careerlabs.lms.api.student.dto.response.StudentBulkImportResponse;
import org.springframework.web.multipart.MultipartFile;

public interface StudentService {

    StudentPageResponse list(String search, Long batchId, String status, PlacementStatus placementStatus,
                              int page, int limit);

    StudentCountResponse count();

    StudentResponse get(Long id);

    StudentResponse create(StudentCreateRequest request);

    StudentResponse update(Long id, StudentUpdateRequest request);

    StudentResponse toggleStatus(Long id);

    StudentResponse assignToBatch(Long studentId, Long batchId);

    void delete(Long id);

    StudentBulkImportResponse bulkImport(MultipartFile file, boolean enrollImportedStudents,
                                         Long defaultCourseId, Long defaultBatchId);
}
