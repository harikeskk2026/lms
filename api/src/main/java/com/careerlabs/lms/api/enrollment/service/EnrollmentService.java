package com.careerlabs.lms.api.enrollment.service;

import com.careerlabs.lms.api.enrollment.dto.response.EnrollmentResponse;

import java.util.List;

public interface EnrollmentService {

    EnrollmentResponse enroll(Long courseId, Long userId);

    List<EnrollmentResponse> listMine(Long userId);
}
