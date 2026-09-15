package com.careerlabs.lms.api.enrollment.service;

import com.careerlabs.lms.api.enrollment.dto.request.BulkEnrollStudentsRequest;
import com.careerlabs.lms.api.enrollment.dto.request.EnrollStudentRequest;
import com.careerlabs.lms.api.enrollment.dto.response.BulkEnrollmentResponse;
import com.careerlabs.lms.api.enrollment.dto.response.CourseEnrolledStudentResponse;
import com.careerlabs.lms.api.enrollment.dto.response.CourseEnrolledStudentsPageResponse;
import com.careerlabs.lms.api.enrollment.dto.response.EnrollmentResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.user.entity.Role;

import java.util.List;

public interface EnrollmentService {

    EnrollmentResponse enroll(Long courseId, Long userId, Role requesterRole);

    List<EnrollmentResponse> listMine(Long userId);

    CourseEnrolledStudentsPageResponse getCourseEnrollments(Long courseId, String search, Long batchId, String status, int page, int limit, JwtUserPrincipal principal);

    CourseEnrolledStudentResponse enrollStudentByAdmin(Long courseId, EnrollStudentRequest request);

    BulkEnrollmentResponse bulkEnrollStudentsByAdmin(Long courseId, BulkEnrollStudentsRequest request);

    void unenrollStudentByAdmin(Long courseId, Long enrollmentId);
}
