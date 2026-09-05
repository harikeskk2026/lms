package com.careerlabs.lms.api.enrollment.service;

import com.careerlabs.lms.api.enrollment.dto.request.EnrollStudentRequest;
import com.careerlabs.lms.api.enrollment.dto.response.CourseEnrolledStudentResponse;
import com.careerlabs.lms.api.enrollment.dto.response.CourseEnrolledStudentsPageResponse;
import com.careerlabs.lms.api.enrollment.dto.response.EnrollmentResponse;

import java.util.List;

public interface EnrollmentService {

    EnrollmentResponse enroll(Long courseId, Long userId);

    List<EnrollmentResponse> listMine(Long userId);

    CourseEnrolledStudentsPageResponse getCourseEnrollments(Long courseId, String search, Long batchId, String status, int page, int limit);

    CourseEnrolledStudentResponse enrollStudentByAdmin(Long courseId, EnrollStudentRequest request);

    void unenrollStudentByAdmin(Long courseId, Long enrollmentId);
}
