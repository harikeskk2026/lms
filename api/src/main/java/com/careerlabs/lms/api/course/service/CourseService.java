package com.careerlabs.lms.api.course.service;

import com.careerlabs.lms.api.course.dto.request.CourseRequest;
import com.careerlabs.lms.api.course.dto.response.CourseResponse;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.security.JwtUserPrincipal;

import java.util.List;

public interface CourseService {

    List<CourseResponse> list(JwtUserPrincipal principal);

    /** Same as {@link #list(JwtUserPrincipal)}, additionally narrowed to courses whose title, course code, or
     * level contains {@code search} (case-insensitive). A blank/null search is a no-op. */
    List<CourseResponse> list(JwtUserPrincipal principal, String search);

    CourseResponse get(Long id, JwtUserPrincipal principal);

    CourseResponse create(CourseRequest request);

    CourseResponse update(Long id, CourseRequest request);

    CourseResponse updateStatus(Long id, CourseStatus status);

    void delete(Long id);
}
