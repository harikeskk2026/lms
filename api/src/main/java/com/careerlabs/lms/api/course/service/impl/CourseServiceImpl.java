package com.careerlabs.lms.api.course.service.impl;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.dto.request.CourseRequest;
import com.careerlabs.lms.api.course.dto.response.CourseResponse;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.course.service.CourseService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final SlugGenerator slugGenerator;

    public CourseServiceImpl(CourseRepository courseRepository, SlugGenerator slugGenerator) {
        this.courseRepository = courseRepository;
        this.slugGenerator = slugGenerator;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseResponse> list() {
        return courseRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(CourseResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CourseResponse get(Long id) {
        return CourseResponse.from(findOrThrow(id));
    }

    @Override
    @Transactional
    public CourseResponse create(CourseRequest request) {
        Course course = new Course();
        applyRequest(course, request);
        course.setSlug(slugGenerator.generateUnique(request.getTitle()));

        return CourseResponse.from(courseRepository.save(course));
    }

    @Override
    @Transactional
    public CourseResponse update(Long id, CourseRequest request) {
        Course course = findOrThrow(id);
        applyRequest(course, request);

        return CourseResponse.from(courseRepository.save(course));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Course course = findOrThrow(id);
        courseRepository.delete(course);
    }

    private Course findOrThrow(Long id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + id));
    }

    private void applyRequest(Course course, CourseRequest request) {
        course.setTitle(request.getTitle());
        course.setDescription(request.getDescription());
        course.setDuration(request.getDuration());
        course.setLevel(request.getLevel());
        course.setThumbnail(request.getThumbnail());
    }
}
