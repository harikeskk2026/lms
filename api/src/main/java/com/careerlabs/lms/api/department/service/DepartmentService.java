package com.careerlabs.lms.api.department.service;

import com.careerlabs.lms.api.department.dto.request.DepartmentRequest;
import com.careerlabs.lms.api.department.dto.response.DepartmentResponse;

import java.util.List;

public interface DepartmentService {

    List<DepartmentResponse> list(Long courseId, String search);

    DepartmentResponse get(Long id);

    DepartmentResponse create(DepartmentRequest request);

    DepartmentResponse update(Long id, DepartmentRequest request);

    void delete(Long id);
}
