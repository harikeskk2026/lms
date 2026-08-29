package com.careerlabs.lms.api.academic.service;

import com.careerlabs.lms.api.academic.dto.request.AcademicDetailsRequest;
import com.careerlabs.lms.api.academic.dto.response.AcademicDetailsResponse;

public interface AcademicDetailsService {

    AcademicDetailsResponse get(Long studentId);

    AcademicDetailsResponse save(Long studentId, AcademicDetailsRequest request);
}
