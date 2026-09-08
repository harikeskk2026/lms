package com.careerlabs.lms.api.enrollment.service.impl;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.dto.request.EnrollStudentRequest;
import com.careerlabs.lms.api.enrollment.dto.response.CourseEnrolledStudentResponse;
import com.careerlabs.lms.api.enrollment.dto.response.CourseEnrolledStudentsPageResponse;
import com.careerlabs.lms.api.enrollment.dto.response.EnrollmentResponse;
import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.enrollment.service.BatchScheduleConflictValidator;
import com.careerlabs.lms.api.enrollment.service.EnrollmentService;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class EnrollmentServiceImpl implements EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;
    private final BatchRepository batchRepository;
    private final BatchScheduleConflictValidator batchScheduleConflictValidator;

    public EnrollmentServiceImpl(EnrollmentRepository enrollmentRepository, StudentRepository studentRepository,
                                  CourseRepository courseRepository, BatchRepository batchRepository,
                                  BatchScheduleConflictValidator batchScheduleConflictValidator) {
        this.enrollmentRepository = enrollmentRepository;
        this.studentRepository = studentRepository;
        this.courseRepository = courseRepository;
        this.batchRepository = batchRepository;
        this.batchScheduleConflictValidator = batchScheduleConflictValidator;
    }

    @Override
    @Transactional
    public EnrollmentResponse enroll(Long courseId, Long userId) {
        Student student = studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for this account"));

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));

        if (course.getStatus() != CourseStatus.PUBLISHED) {
            throw new BadRequestException("This course is not open for enrollment");
        }

        Optional<Enrollment> existingOpt = enrollmentRepository.findByStudentIdAndCourseId(student.getId(), courseId);
        if (existingOpt.isPresent()) {
            Enrollment existing = existingOpt.get();
            if (existing.isActive()) {
                throw new ConflictException("Already enrolled in this course");
            }
            // Validate schedule conflict if reactivated enrollment has a batch
            if (existing.getBatch() != null && existing.getBatch().isActive()) {
                batchScheduleConflictValidator.validate(student, existing.getBatch(), courseId);
            }
            existing.setActive(true);
            existing.setEnrolledAt(Instant.now());
            return EnrollmentResponse.from(enrollmentRepository.save(existing));
        }

        Enrollment enrollment = new Enrollment();
        enrollment.setStudent(student);
        enrollment.setCourse(course);
        enrollment.setActive(true);

        try {
            return EnrollmentResponse.from(enrollmentRepository.save(enrollment));
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("Already enrolled in this course");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnrollmentResponse> listMine(Long userId) {
        Student student = studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for this account"));

        return enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(student.getId()).stream()
                .map(EnrollmentResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CourseEnrolledStudentsPageResponse getCourseEnrollments(Long courseId, String search, Long batchId,
                                                                    String status, int page, int limit) {
        if (!courseRepository.existsById(courseId)) {
            throw new ResourceNotFoundException("Course not found: " + courseId);
        }

        int pageNumber = Math.max(page, 1);
        int pageSize = limit > 0 ? limit : 20;

        Specification<Enrollment> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Filter by Course
            predicates.add(cb.equal(root.get("course").get("id"), courseId));

            // Status filter (default: active enrollments only)
            if ("all".equalsIgnoreCase(status)) {
                // Don't filter by active status
            } else if ("inactive".equalsIgnoreCase(status)) {
                predicates.add(cb.isFalse(root.get("active")));
            } else {
                predicates.add(cb.isTrue(root.get("active")));
            }

            // Batch filter
            if (batchId != null) {
                Predicate directBatch = cb.equal(root.get("batch").get("id"), batchId);
                Predicate studentBatch = cb.and(
                        cb.isNull(root.get("batch")),
                        cb.equal(root.get("student").get("batch").get("id"), batchId)
                );
                predicates.add(cb.or(directBatch, studentBatch));
            }

            // Search filter across student name, email, and enrollmentNo
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                Predicate nameMatch = cb.like(cb.lower(root.get("student").get("user").get("name")), pattern);
                Predicate emailMatch = cb.like(cb.lower(root.get("student").get("user").get("email")), pattern);
                Predicate noMatch = cb.like(cb.lower(root.get("student").get("enrollmentNo")), pattern);
                predicates.add(cb.or(nameMatch, emailMatch, noMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Pageable pageable = PageRequest.of(pageNumber - 1, pageSize, Sort.by(Sort.Direction.DESC, "enrolledAt"));
        Page<Enrollment> pageResult = enrollmentRepository.findAll(spec, pageable);

        List<CourseEnrolledStudentResponse> content = pageResult.getContent().stream()
                .map(CourseEnrolledStudentResponse::from)
                .toList();

        return new CourseEnrolledStudentsPageResponse(
                content,
                pageResult.getTotalElements(),
                pageNumber,
                pageResult.getTotalPages()
        );
    }

    @Override
    @Transactional
    public CourseEnrolledStudentResponse enrollStudentByAdmin(Long courseId, EnrollStudentRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));

        if (course.getStatus() != CourseStatus.PUBLISHED) {
            throw new BadRequestException("This course is not open for enrollment (current status: " + course.getStatus() + ")");
        }

        Student student = studentRepository.findById(request.studentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + request.studentId()));

        Batch batch = null;
        if (request.batchId() != null) {
            batch = batchRepository.findById(request.batchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Batch not found with ID: " + request.batchId()));

            if (!batch.getCourse().getId().equals(courseId)) {
                throw new BadRequestException("Selected batch '" + batch.getName() + "' does not belong to course '" + course.getTitle() + "'");
            }

            if (!batch.isActive()) {
                throw new BadRequestException("Batch '" + batch.getName() + "' is inactive");
            }

            long activeInBatch = enrollmentRepository.countByBatchIdAndActiveTrue(batch.getId());
            if (activeInBatch >= batch.getMaxStudents()) {
                throw new BadRequestException("Batch '" + batch.getName() + "' is at full capacity (" + batch.getMaxStudents() + " students max)");
            }
        }

        // Check existing enrollment
        Optional<Enrollment> existingOpt = enrollmentRepository.findByStudentIdAndCourseId(student.getId(), courseId);
        Enrollment enrollment;

        if (existingOpt.isPresent()) {
            enrollment = existingOpt.get();
            if (enrollment.isActive()) {
                throw new ConflictException("Student '" + student.getUser().getName() + "' is already actively enrolled in this course");
            }
            // Validate schedule conflict before reactivating (exclude this course's inactive enrollment)
            if (batch != null) {
                batchScheduleConflictValidator.validate(student, batch, courseId);
            } else if (enrollment.getBatch() != null && enrollment.getBatch().isActive()) {
                // Reactivating enrollment keeps its original batch - validate that batch if no new batch provided
                batchScheduleConflictValidator.validate(student, enrollment.getBatch(), courseId);
            }
            // Reactivate existing enrollment
            enrollment.setActive(true);
            if (batch != null) {
                enrollment.setBatch(batch);
            }
            enrollment.setEnrolledAt(Instant.now());
        } else {
            // Validate schedule conflict for new enrollment
            if (batch != null) {
                batchScheduleConflictValidator.validate(student, batch);
            }
            enrollment = new Enrollment();
            enrollment.setStudent(student);
            enrollment.setCourse(course);
            enrollment.setBatch(batch);
            enrollment.setActive(true);
        }

        // Backward compatibility: Only populate Student.course if the student has no primary course assigned
        if (student.getCourse() == null) {
            student.setCourse(course);
            if (student.getBatch() == null && batch != null) {
                student.setBatch(batch);
            }
            studentRepository.save(student);
        }

        try {
            enrollment = enrollmentRepository.save(enrollment);
            return CourseEnrolledStudentResponse.from(enrollment);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("Student is already enrolled in this course");
        }
    }

    @Override
    @Transactional
    public void unenrollStudentByAdmin(Long courseId, Long enrollmentId) {
        Enrollment enrollment = enrollmentRepository.findByIdAndCourseId(enrollmentId, courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Enrollment record #" + enrollmentId + " not found for course #" + courseId));

        // Soft unenrollment: preserve history and audit trails by setting active = false
        enrollment.setActive(false);
        enrollmentRepository.save(enrollment);
    }
}
