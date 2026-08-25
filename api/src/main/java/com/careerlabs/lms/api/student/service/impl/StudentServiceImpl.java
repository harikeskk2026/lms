package com.careerlabs.lms.api.student.service.impl;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.college.entity.College;
import com.careerlabs.lms.api.college.repository.CollegeRepository;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.department.entity.Department;
import com.careerlabs.lms.api.department.repository.DepartmentRepository;
import com.careerlabs.lms.api.student.dto.request.StudentCreateRequest;
import com.careerlabs.lms.api.student.dto.request.StudentUpdateRequest;
import com.careerlabs.lms.api.student.dto.response.StudentCountResponse;
import com.careerlabs.lms.api.student.dto.response.StudentPageResponse;
import com.careerlabs.lms.api.student.dto.response.StudentResponse;
import com.careerlabs.lms.api.student.entity.PlacementStatus;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.student.service.StudentService;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class StudentServiceImpl implements StudentService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final BatchRepository batchRepository;
    private final CollegeRepository collegeRepository;
    private final CourseRepository courseRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;

    public StudentServiceImpl(StudentRepository studentRepository, UserRepository userRepository,
                               BatchRepository batchRepository, CollegeRepository collegeRepository,
                               CourseRepository courseRepository, DepartmentRepository departmentRepository,
                               PasswordEncoder passwordEncoder) {
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.batchRepository = batchRepository;
        this.collegeRepository = collegeRepository;
        this.courseRepository = courseRepository;
        this.departmentRepository = departmentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional(readOnly = true)
    public StudentPageResponse list(String search, Long batchId, String status, PlacementStatus placementStatus,
                                     int page, int limit) {
        int pageNumber = Math.max(page, 1);
        int pageSize = limit > 0 ? limit : 20;

        Pageable pageable = PageRequest.of(pageNumber - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Student> result = studentRepository.findAll(buildSpecification(search, batchId, status, placementStatus), pageable);

        List<StudentResponse> students = result.getContent().stream()
                .map(StudentResponse::from)
                .toList();

        return new StudentPageResponse(students, result.getTotalElements(), pageNumber, result.getTotalPages());
    }

    @Override
    @Transactional(readOnly = true)
    public StudentCountResponse count() {
        long total = studentRepository.count();
        long active = studentRepository.count((root, query, cb) -> cb.isTrue(root.get("user").get("active")));
        return new StudentCountResponse(total, active, total - active);
    }

    @Override
    @Transactional(readOnly = true)
    public StudentResponse get(Long id) {
        return StudentResponse.from(findOrThrow(id));
    }

    @Override
    @Transactional
    public StudentResponse create(StudentCreateRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new ConflictException("Email already in use");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.STUDENT);
        user.setActive(true);
        user = userRepository.save(user);

        Student student = new Student();
        student.setUser(user);
        student.setPhone(request.getPhone());
        student.setEnrollmentNo(generateEnrollmentNo(user.getId()));
        if (request.getBatchId() != null) {
            student.setBatch(findBatchOrThrow(request.getBatchId()));
        }
        if (request.getCollegeId() != null) {
            student.setCollege(findCollegeOrThrow(request.getCollegeId()));
        }
        if (request.getCourseId() != null) {
            student.setCourse(findCourseOrThrow(request.getCourseId()));
        }
        if (request.getDepartmentId() != null) {
            student.setDepartment(findDepartmentOrThrow(request.getDepartmentId()));
        }

        return StudentResponse.from(studentRepository.save(student));
    }

    @Override
    @Transactional
    public StudentResponse update(Long id, StudentUpdateRequest request) {
        Student student = findOrThrow(id);
        applyRequest(student, request);
        userRepository.save(student.getUser());

        return StudentResponse.from(studentRepository.save(student));
    }

    @Override
    @Transactional
    public StudentResponse toggleStatus(Long id) {
        Student student = findOrThrow(id);
        User user = student.getUser();
        user.setActive(!user.isActive());
        userRepository.save(user);

        return StudentResponse.from(student);
    }

    private Student findOrThrow(Long id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + id));
    }

    private Batch findBatchOrThrow(Long batchId) {
        return batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + batchId));
    }

    private College findCollegeOrThrow(Long collegeId) {
        return collegeRepository.findById(collegeId)
                .orElseThrow(() -> new ResourceNotFoundException("College not found: " + collegeId));
    }

    private Course findCourseOrThrow(Long courseId) {
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));
    }

    private Department findDepartmentOrThrow(Long departmentId) {
        return departmentRepository.findById(departmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + departmentId));
    }

    private void applyRequest(Student student, StudentUpdateRequest request) {
        student.getUser().setName(request.getName());
        student.setPhone(request.getPhone());
        student.setAddress(request.getAddress());
        student.setQualification(request.getQualification());
        student.setLinkedinUrl(request.getLinkedinUrl());
        student.setGithubUrl(request.getGithubUrl());
        student.setPlacementStatus(request.getPlacementStatus());
        student.setBatch(request.getBatchId() != null ? findBatchOrThrow(request.getBatchId()) : null);
        student.setCollege(request.getCollegeId() != null ? findCollegeOrThrow(request.getCollegeId()) : null);
        student.setCourse(request.getCourseId() != null ? findCourseOrThrow(request.getCourseId()) : null);
        student.setDepartment(request.getDepartmentId() != null ? findDepartmentOrThrow(request.getDepartmentId()) : null);
    }

    private String generateEnrollmentNo(Long userId) {
        return "CL-%d-%04d".formatted(Year.now().getValue(), userId);
    }

    private Specification<Student> buildSpecification(String search, Long batchId, String status,
                                                        PlacementStatus placementStatus) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("user").get("name")), pattern),
                        cb.like(cb.lower(root.get("user").get("email")), pattern)));
            }
            if (batchId != null) {
                predicates.add(cb.equal(root.get("batch").get("id"), batchId));
            }
            if ("active".equalsIgnoreCase(status)) {
                predicates.add(cb.isTrue(root.get("user").get("active")));
            } else if ("inactive".equalsIgnoreCase(status)) {
                predicates.add(cb.isFalse(root.get("user").get("active")));
            }
            if (placementStatus != null) {
                predicates.add(cb.equal(root.get("placementStatus"), placementStatus));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
