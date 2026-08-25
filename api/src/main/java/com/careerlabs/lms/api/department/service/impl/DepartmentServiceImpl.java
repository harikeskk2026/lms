package com.careerlabs.lms.api.department.service.impl;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.department.dto.request.DepartmentRequest;
import com.careerlabs.lms.api.department.dto.response.DepartmentResponse;
import com.careerlabs.lms.api.department.entity.Department;
import com.careerlabs.lms.api.department.repository.DepartmentRepository;
import com.careerlabs.lms.api.department.service.DepartmentService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DepartmentServiceImpl implements DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final CourseRepository courseRepository;

    public DepartmentServiceImpl(DepartmentRepository departmentRepository, CourseRepository courseRepository) {
        this.departmentRepository = departmentRepository;
        this.courseRepository = courseRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentResponse> list(Long courseId, String search) {
        if (courseId == null) {
            throw new ResourceNotFoundException("Course is required to list departments");
        }

        List<Department> departments = (search == null || search.isBlank())
                ? departmentRepository.findByCourseIdOrderByNameAsc(courseId)
                : departmentRepository.findByCourseIdAndNameContainingIgnoreCaseOrderByNameAsc(courseId, search);

        return departments.stream().map(DepartmentResponse::from).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DepartmentResponse get(Long id) {
        return DepartmentResponse.from(findOrThrow(id));
    }

    @Override
    @Transactional
    public DepartmentResponse create(DepartmentRequest request) {
        Department department = new Department();
        applyRequest(department, request);

        return DepartmentResponse.from(departmentRepository.save(department));
    }

    @Override
    @Transactional
    public DepartmentResponse update(Long id, DepartmentRequest request) {
        Department department = findOrThrow(id);
        applyRequest(department, request);

        return DepartmentResponse.from(departmentRepository.save(department));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Department department = findOrThrow(id);
        departmentRepository.delete(department);
    }

    private Department findOrThrow(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + id));
    }

    private void applyRequest(Department department, DepartmentRequest request) {
        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + request.getCourseId()));

        department.setName(request.getName());
        department.setCourse(course);
    }
}
