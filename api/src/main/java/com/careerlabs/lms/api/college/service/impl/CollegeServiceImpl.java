package com.careerlabs.lms.api.college.service.impl;

import com.careerlabs.lms.api.college.dto.request.CollegeRequest;
import com.careerlabs.lms.api.college.dto.response.CollegeResponse;
import com.careerlabs.lms.api.college.entity.College;
import com.careerlabs.lms.api.college.repository.CollegeRepository;
import com.careerlabs.lms.api.college.service.CollegeService;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class CollegeServiceImpl implements CollegeService {

    private final CollegeRepository collegeRepository;
    private final CourseRepository courseRepository;

    public CollegeServiceImpl(CollegeRepository collegeRepository, CourseRepository courseRepository) {
        this.collegeRepository = collegeRepository;
        this.courseRepository = courseRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CollegeResponse> list(String search) {
        List<College> colleges = (search == null || search.isBlank())
                ? collegeRepository.findAllByOrderByNameAsc()
                : collegeRepository.findByNameContainingIgnoreCaseOrderByNameAsc(search);

        return colleges.stream().map(CollegeResponse::from).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CollegeResponse get(Long id) {
        return CollegeResponse.from(findOrThrow(id));
    }

    @Override
    @Transactional
    public CollegeResponse create(CollegeRequest request) {
        if (collegeRepository.existsByNameIgnoreCase(request.getName())) {
            throw new ConflictException("A college with this name already exists");
        }

        College college = new College();
        applyRequest(college, request);

        return CollegeResponse.from(collegeRepository.save(college));
    }

    @Override
    @Transactional
    public CollegeResponse update(Long id, CollegeRequest request) {
        College college = findOrThrow(id);
        applyRequest(college, request);

        return CollegeResponse.from(collegeRepository.save(college));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        College college = findOrThrow(id);
        collegeRepository.delete(college);
    }

    private College findOrThrow(Long id) {
        return collegeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("College not found: " + id));
    }

    private void applyRequest(College college, CollegeRequest request) {
        college.setName(request.getName());

        Set<Course> courses = new LinkedHashSet<>();
        if (request.getCourseIds() != null) {
            for (Long courseId : request.getCourseIds()) {
                Course course = courseRepository.findById(courseId)
                        .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));
                courses.add(course);
            }
        }
        college.setCourses(courses);
    }
}
