package com.careerlabs.lms.api.course.service;

import com.careerlabs.lms.api.common.dto.response.BulkImportResponse;
import com.careerlabs.lms.api.course.dto.request.CourseRequest;
import com.careerlabs.lms.api.course.dto.response.CourseResponse;
import com.careerlabs.lms.api.course.dto.response.CourseStatusCountsResponse;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface CourseService {

    List<CourseResponse> list(JwtUserPrincipal principal);

    /** Same as {@link #list(JwtUserPrincipal)}, additionally narrowed to courses whose title, course code, or
     * level contains {@code search} (case-insensitive). A blank/null search is a no-op. */
    List<CourseResponse> list(JwtUserPrincipal principal, String search);

    /** Same as {@link #list(JwtUserPrincipal, String)}, additionally narrowed to courses with the given
     * {@code status}. Pass {@code null} to ignore status. Role scoping is preserved: students always see only
     * PUBLISHED courses and never DRAFT/ARCHIVED, regardless of the requested status. */
    List<CourseResponse> list(JwtUserPrincipal principal, String search, CourseStatus status);

    /** Per-status counts across all courses. Admin-only. */
    CourseStatusCountsResponse statusCounts();

    CourseResponse get(Long id, JwtUserPrincipal principal);

    CourseResponse create(CourseRequest request);

    BulkImportResponse<CourseResponse> bulkImportCourses(MultipartFile file);

    CourseResponse update(Long id, CourseRequest request);

    CourseResponse updateStatus(Long id, CourseStatus status);

    void delete(Long id);
}
