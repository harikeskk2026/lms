package com.careerlabs.lms.api.course.service.impl;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.dto.request.CourseRequest;
import com.careerlabs.lms.api.course.dto.response.CourseResponse;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.course.service.CourseService;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final SlugGenerator slugGenerator;
    private final CourseAccessGuard accessGuard;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;

    public CourseServiceImpl(CourseRepository courseRepository, SlugGenerator slugGenerator,
                              CourseAccessGuard accessGuard, StudentRepository studentRepository,
                              EnrollmentRepository enrollmentRepository) {
        this.courseRepository = courseRepository;
        this.slugGenerator = slugGenerator;
        this.accessGuard = accessGuard;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseResponse> list(JwtUserPrincipal principal) {
        if (accessGuard.isAdmin(principal)) {
            return courseRepository.findAllByOrderByCreatedAtDesc().stream()
                    .map(CourseResponse::from)
                    .toList();
        }

        Set<Long> enrolledCourseIds = enrolledCourseIds(principal);
        return courseRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(course -> course.getStatus() == CourseStatus.PUBLISHED || enrolledCourseIds.contains(course.getId()))
                .map(course -> CourseResponse.from(course, enrolledCourseIds.contains(course.getId())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CourseResponse get(Long id, JwtUserPrincipal principal) {
        Course course = findOrThrow(id);
        accessGuard.requireVisible(principal, course);
        return CourseResponse.from(course, accessGuard.isEnrolled(principal, id));
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
    public CourseResponse updateStatus(Long id, CourseStatus status) {
        Course course = findOrThrow(id);
        course.setStatus(status);
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
        course.setStatus(request.getStatus());
    }

    private Set<Long> enrolledCourseIds(JwtUserPrincipal principal) {
        if (principal == null) {
            return Set.of();
        }
        return studentRepository.findByUserId(principal.id())
                .map(student -> enrollmentRepository.findAllByStudentIdOrderByEnrolledAtDesc(student.getId()).stream()
                        .map(enrollment -> enrollment.getCourse().getId())
                        .collect(Collectors.toSet()))
                .orElseGet(Set::of);
    }
}
