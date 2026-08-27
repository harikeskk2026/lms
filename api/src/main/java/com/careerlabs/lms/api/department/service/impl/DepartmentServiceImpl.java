package com.careerlabs.lms.api.department.service.impl;

import com.careerlabs.lms.api.college.entity.College;
import com.careerlabs.lms.api.college.repository.CollegeRepository;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
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
    private final CollegeRepository collegeRepository;

    public DepartmentServiceImpl(DepartmentRepository departmentRepository, CollegeRepository collegeRepository) {
        this.departmentRepository = departmentRepository;
        this.collegeRepository = collegeRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentResponse> list(Long collegeId, String search) {
        if (collegeId == null) {
            throw new ResourceNotFoundException("College is required to list departments");
        }

        List<Department> departments = (search == null || search.isBlank())
                ? departmentRepository.findByCollegeIdOrderByNameAsc(collegeId)
                : departmentRepository.findByCollegeIdAndNameContainingIgnoreCaseOrderByNameAsc(collegeId, search);

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
        College college = collegeRepository.findById(request.getCollegeId())
                .orElseThrow(() -> new ResourceNotFoundException("College not found: " + request.getCollegeId()));

        department.setName(request.getName());
        department.setCollege(college);
    }
}
