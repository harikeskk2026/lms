package com.careerlabs.lms.api.course.service.impl;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.dto.request.CourseRequest;
import com.careerlabs.lms.api.course.dto.response.CourseResponse;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.course.service.CourseService;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.material.repository.MaterialRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.syllabus.entity.SyllabusModule;
import com.careerlabs.lms.api.syllabus.repository.SyllabusModuleRepository;
import com.careerlabs.lms.api.syllabus.service.SyllabusService;
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
    private final SyllabusModuleRepository moduleRepository;
    private final SyllabusService syllabusService;
    private final MaterialRepository materialRepository;

    public CourseServiceImpl(CourseRepository courseRepository, SlugGenerator slugGenerator,
                              CourseAccessGuard accessGuard, StudentRepository studentRepository,
                              EnrollmentRepository enrollmentRepository, SyllabusModuleRepository moduleRepository,
                              SyllabusService syllabusService, MaterialRepository materialRepository) {
        this.courseRepository = courseRepository;
        this.slugGenerator = slugGenerator;
        this.accessGuard = accessGuard;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.moduleRepository = moduleRepository;
        this.syllabusService = syllabusService;
        this.materialRepository = materialRepository;
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
                .filter(course -> course.getStatus() == CourseStatus.PUBLISHED
                        || (course.getStatus() == CourseStatus.ARCHIVED && enrolledCourseIds.contains(course.getId())))
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
        if (request.getStatus() == CourseStatus.ARCHIVED) {
            throw new BadRequestException("Courses cannot be created directly as ARCHIVED. Archive is available after the course is created.");
        }
        Course course = new Course();
        applyRequest(course, request, true);
        if (request.getSlug() != null && !request.getSlug().isBlank()) {
            String cleanSlug = slugGenerator.clean(request.getSlug());
            if (courseRepository.existsBySlug(cleanSlug)) {
                throw new BadRequestException("Course slug is already in use: " + cleanSlug);
            }
            course.setSlug(cleanSlug);
        } else {
            course.setSlug(slugGenerator.generateUnique(request.getTitle()));
        }

        return CourseResponse.from(courseRepository.save(course));
    }

    @Override
    @Transactional
    public CourseResponse update(Long id, CourseRequest request) {
        Course course = findOrThrow(id);
        // Content edit must not bypass status lifecycle - validate any status change via PUT as well
        if (request.getStatus() != null && request.getStatus() != course.getStatus()) {
            validateTransition(course.getStatus(), request.getStatus());
        }
        applyRequest(course, request, false);
        if (request.getSlug() != null && !request.getSlug().isBlank()) {
            String cleanSlug = slugGenerator.clean(request.getSlug());
            if (courseRepository.existsBySlugAndIdNot(cleanSlug, id)) {
                throw new BadRequestException("Course slug is already in use: " + cleanSlug);
            }
            course.setSlug(cleanSlug);
        }
        return CourseResponse.from(courseRepository.save(course));
    }

    @Override
    @Transactional
    public CourseResponse updateStatus(Long id, CourseStatus status) {
        Course course = findOrThrow(id);
        if (status == course.getStatus()) {
            return CourseResponse.from(course);
        }
        validateTransition(course.getStatus(), status);
        course.setStatus(status);
        return CourseResponse.from(courseRepository.save(course));
    }

    private void validateTransition(CourseStatus current, CourseStatus requested) {
        if (current == requested) {
            return;
        }
        boolean allowed = (current == CourseStatus.DRAFT && requested == CourseStatus.PUBLISHED)
                || (current == CourseStatus.PUBLISHED && requested == CourseStatus.ARCHIVED);
        if (!allowed) {
            throw new BadRequestException(
                    String.format("Invalid status transition from %s to %s. Allowed transitions are DRAFT -> PUBLISHED and PUBLISHED -> ARCHIVED. ARCHIVED is terminal and DRAFT cannot be skipped to ARCHIVED.", current, requested));
        }
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Course course = findOrThrow(id);

        for (SyllabusModule module : moduleRepository.findAllByCourseIdOrderByOrderIndexAsc(id)) {
            syllabusService.deleteModule(module.getId());
        }
        materialRepository.deleteAllByCourseId(id);
        enrollmentRepository.deleteAllByCourseId(id);

        courseRepository.delete(course);
    }

    private Course findOrThrow(Long id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + id));
    }

    private void applyRequest(Course course, CourseRequest request, boolean isCreate) {
        course.setTitle(request.getTitle());
        course.setDescription(request.getDescription());
        course.setDuration(request.getDuration());
        course.setLevel(request.getLevel());
        course.setThumbnail(request.getThumbnail());
        course.setStatus(request.getStatus());
        course.setCourseCode(request.getCourseCode() != null && !request.getCourseCode().isBlank() ? request.getCourseCode().trim() : null);
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
