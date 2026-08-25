package com.careerlabs.lms.api.course.service;

import com.careerlabs.lms.api.course.dto.request.CourseRequest;
import com.careerlabs.lms.api.course.dto.response.CourseResponse;

import java.util.List;

public interface CourseService {

    List<CourseResponse> list();

    CourseResponse get(Long id);

    CourseResponse create(CourseRequest request);

    CourseResponse update(Long id, CourseRequest request);

    void delete(Long id);
}
