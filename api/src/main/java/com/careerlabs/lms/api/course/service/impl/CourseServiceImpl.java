package com.careerlabs.lms.api.course.service.impl;

import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

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
    private final BatchRepository batchRepository;

    public CourseServiceImpl(CourseRepository courseRepository, SlugGenerator slugGenerator,
                              CourseAccessGuard accessGuard, StudentRepository studentRepository,
                              EnrollmentRepository enrollmentRepository, SyllabusModuleRepository moduleRepository,
                              SyllabusService syllabusService, MaterialRepository materialRepository,
                              BatchRepository batchRepository) {
        this.courseRepository = courseRepository;
        this.slugGenerator = slugGenerator;
        this.accessGuard = accessGuard;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.moduleRepository = moduleRepository;
        this.syllabusService = syllabusService;
        this.materialRepository = materialRepository;
        this.batchRepository = batchRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseResponse> list(JwtUserPrincipal principal) {
        if (accessGuard.isAdmin(principal)) {
            return courseRepository.findAllByOrderByCreatedAtDesc().stream()
                    .map(CourseResponse::from)
                    .toList();
        }

        if (accessGuard.isTrainer(principal)) {
            return courseRepository.findCoursesByTrainerId(principal.id()).stream()
                    .map(c -> CourseResponse.from(c, true))
                    .toList();
        }

        if (accessGuard.isStudent(principal)) {
            Set<Long> enrolledIds = enrolledCourseIds(principal);
            return courseRepository.findByStatusOrderByCreatedAtDesc(CourseStatus.PUBLISHED).stream()
                    .map(c -> CourseResponse.from(c, enrolledIds.contains(c.getId())))
                    .toList();
        }

        return List.of();
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
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
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
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
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
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
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
                || (current == CourseStatus.PUBLISHED && requested == CourseStatus.ARCHIVED)
                || (current == CourseStatus.ARCHIVED && requested == CourseStatus.PUBLISHED)
                || (current == CourseStatus.ARCHIVED && requested == CourseStatus.DRAFT);
        if (!allowed) {
            throw new BadRequestException(
                    String.format("Invalid status transition from %s to %s. Allowed transitions are DRAFT -> PUBLISHED, PUBLISHED -> ARCHIVED, and ARCHIVED -> PUBLISHED or DRAFT. DRAFT cannot be skipped directly to ARCHIVED.", current, requested));
        }
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public void delete(Long id) {
        Course course = findOrThrow(id);

        if (batchRepository.existsByCourseId(id)) {
            throw new ConflictException("Course cannot be deleted while batches reference it");
        }

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
                .map(student -> {
                    Set<Long> ids = new HashSet<>();
                    if (student.getBatch() != null && student.getBatch().getCourse() != null) {
                        ids.add(student.getBatch().getCourse().getId());
                    }
                    if (student.getId() != null) {
                        enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(student.getId())
                                .forEach(enrollment -> ids.add(enrollment.getCourse().getId()));
                    }
                    return ids;
                })
                .orElseGet(Set::of);
    }
}
