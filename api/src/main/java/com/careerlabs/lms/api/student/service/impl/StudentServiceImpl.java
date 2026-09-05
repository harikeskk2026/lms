package com.careerlabs.lms.api.student.service.impl;

import com.careerlabs.lms.api.academic.repository.AcademicDetailsRepository;
import com.careerlabs.lms.api.announcement.entity.AnnouncementComment;
import com.careerlabs.lms.api.announcement.repository.AnnouncementAcknowledgmentRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementCommentRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementViewRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceAlertRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceCorrectionRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceGoalRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.notification.repository.NotificationRepository;
import com.careerlabs.lms.api.placement.repository.DriveApplicationRepository;
import com.careerlabs.lms.api.placement.repository.DriveApplicationStatusHistoryRepository;
import com.careerlabs.lms.api.placement.repository.ResumeDataRepository;
import com.careerlabs.lms.api.quiz.repository.QuestionAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuizAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.StudentAchievementRepository;
import com.careerlabs.lms.api.quiz.repository.StudentGameStatsRepository;
import com.careerlabs.lms.api.recordedsession.repository.PlaybackSessionRepository;
import com.careerlabs.lms.api.student.dto.request.StudentCreateRequest;
import com.careerlabs.lms.api.student.dto.request.StudentUpdateRequest;
import com.careerlabs.lms.api.student.dto.response.StudentCountResponse;
import com.careerlabs.lms.api.student.dto.response.StudentPageResponse;
import com.careerlabs.lms.api.student.dto.response.StudentResponse;
import com.careerlabs.lms.api.student.entity.PlacementStatus;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.student.service.StudentService;
import com.careerlabs.lms.api.submission.repository.AssignmentSubmissionRepository;
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
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final PasswordEncoder passwordEncoder;

    // Delete-cascade dependencies only - see delete(Long) for why each is here.
    private final AttendanceCorrectionRepository attendanceCorrectionRepository;
    private final AttendanceRepository attendanceRepository;
    private final AttendanceAlertRepository attendanceAlertRepository;
    private final AttendanceGoalRepository attendanceGoalRepository;
    private final AssignmentSubmissionRepository assignmentSubmissionRepository;
    private final AnnouncementViewRepository announcementViewRepository;
    private final AnnouncementAcknowledgmentRepository announcementAcknowledgmentRepository;
    private final AnnouncementCommentRepository announcementCommentRepository;
    private final DriveApplicationStatusHistoryRepository driveApplicationStatusHistoryRepository;
    private final DriveApplicationRepository driveApplicationRepository;
    private final ResumeDataRepository resumeDataRepository;
    private final AcademicDetailsRepository academicDetailsRepository;
    private final QuestionAttemptRepository questionAttemptRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final StudentGameStatsRepository studentGameStatsRepository;
    private final StudentAchievementRepository studentAchievementRepository;
    private final PlaybackSessionRepository playbackSessionRepository;
    private final NotificationRepository notificationRepository;

    public StudentServiceImpl(StudentRepository studentRepository, UserRepository userRepository,
                               BatchRepository batchRepository, CourseRepository courseRepository,
                               EnrollmentRepository enrollmentRepository, PasswordEncoder passwordEncoder,
                               AttendanceCorrectionRepository attendanceCorrectionRepository,
                               AttendanceRepository attendanceRepository,
                               AttendanceAlertRepository attendanceAlertRepository,
                               AttendanceGoalRepository attendanceGoalRepository,
                               AssignmentSubmissionRepository assignmentSubmissionRepository,
                               AnnouncementViewRepository announcementViewRepository,
                               AnnouncementAcknowledgmentRepository announcementAcknowledgmentRepository,
                               AnnouncementCommentRepository announcementCommentRepository,
                               DriveApplicationStatusHistoryRepository driveApplicationStatusHistoryRepository,
                               DriveApplicationRepository driveApplicationRepository,
                               ResumeDataRepository resumeDataRepository,
                               AcademicDetailsRepository academicDetailsRepository,
                               QuestionAttemptRepository questionAttemptRepository,
                               QuizAttemptRepository quizAttemptRepository,
                               StudentGameStatsRepository studentGameStatsRepository,
                               StudentAchievementRepository studentAchievementRepository,
                               PlaybackSessionRepository playbackSessionRepository,
                               NotificationRepository notificationRepository) {
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.batchRepository = batchRepository;
        this.courseRepository = courseRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.passwordEncoder = passwordEncoder;
        this.attendanceCorrectionRepository = attendanceCorrectionRepository;
        this.attendanceRepository = attendanceRepository;
        this.attendanceAlertRepository = attendanceAlertRepository;
        this.attendanceGoalRepository = attendanceGoalRepository;
        this.assignmentSubmissionRepository = assignmentSubmissionRepository;
        this.announcementViewRepository = announcementViewRepository;
        this.announcementAcknowledgmentRepository = announcementAcknowledgmentRepository;
        this.announcementCommentRepository = announcementCommentRepository;
        this.driveApplicationStatusHistoryRepository = driveApplicationStatusHistoryRepository;
        this.driveApplicationRepository = driveApplicationRepository;
        this.resumeDataRepository = resumeDataRepository;
        this.academicDetailsRepository = academicDetailsRepository;
        this.questionAttemptRepository = questionAttemptRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.studentGameStatsRepository = studentGameStatsRepository;
        this.studentAchievementRepository = studentAchievementRepository;
        this.playbackSessionRepository = playbackSessionRepository;
        this.notificationRepository = notificationRepository;
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
        assignBatch(student, request.getBatchId());
        if (request.getCourseId() != null) {
            Course course = findCourseOrThrow(request.getCourseId());
            if (course.getStatus() != CourseStatus.PUBLISHED) {
                throw new BadRequestException("Cannot enroll student in course '" + course.getTitle() + "' because it is not PUBLISHED (current status: " + course.getStatus() + ")");
            }
            student.setCourse(course);
        }

        student = studentRepository.save(student);
        syncCourseEnrollment(student);

        return StudentResponse.from(student);
    }

    @Override
    @Transactional
    public StudentResponse update(Long id, StudentUpdateRequest request) {
        Student student = findOrThrow(id);
        applyRequest(student, request);
        userRepository.save(student.getUser());
        student = studentRepository.save(student);
        syncCourseEnrollment(student);

        return StudentResponse.from(student);
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

    @Override
    @Transactional
    public StudentResponse assignToBatch(Long studentId, Long batchId) {
        Student student = findOrThrow(studentId);
        assignBatch(student, batchId);
        student = studentRepository.save(student);

        return StudentResponse.from(student);
    }

    /**
     * Permanently removes a student's account and everything scoped to it.
     * There's no soft-delete/archive table in this codebase (see
     * {@code toggleStatus} for deactivation, which is reversible) - this is a
     * real, irreversible delete, so every table with a foreign key to Student
     * or to this account's User row has to be cleared first, in dependency
     * order, or the final delete throws a constraint violation.
     *
     * <p>Two id spaces are in play: most tables key off {@code Student.id},
     * but the quiz/gamification and recorded-session subsystems store a plain
     * {@code student_id} column that actually holds {@code User.id} (see
     * {@code QuizAttempt.studentId}, {@code PlaybackSession.studentId}) -
     * mixing these up would silently delete nothing. {@code RecordedSessionAuditLog}
     * is deliberately left untouched: it's an intentionally-permanent
     * leak/dispute-investigation trail, not user data.
     */
    @Override
    @Transactional
    public void delete(Long id) {
        Student student = findOrThrow(id);
        Long studentId = student.getId();
        Long userId = student.getUser().getId();

        // Attendance - corrections reference a specific Attendance row, so they
        // must be removed before the Attendance rows themselves.
        attendanceCorrectionRepository.deleteAllByStudentId(studentId);
        attendanceRepository.deleteAllByStudentId(studentId);
        attendanceAlertRepository.deleteAllByStudentId(studentId);
        attendanceGoalRepository.deleteByStudentId(studentId);

        // Assignments
        assignmentSubmissionRepository.deleteAllByStudentId(studentId);

        // Announcements: detach any replies authored by other users before
        // removing this student's own comments, so a reply never gets silently
        // destroyed or blocked by the parent_comment_id constraint.
        announcementViewRepository.deleteAllByStudentId(studentId);
        announcementAcknowledgmentRepository.deleteAllByStudentId(studentId);
        List<AnnouncementComment> ownComments = announcementCommentRepository.findByUser_Id(userId);
        if (!ownComments.isEmpty()) {
            List<Long> ownCommentIds = ownComments.stream().map(AnnouncementComment::getId).toList();
            announcementCommentRepository.clearParentCommentIn(ownCommentIds);
        }
        announcementCommentRepository.deleteAllByUser_Id(userId);

        // Placement - status history references the application, so it must go
        // before the DriveApplication rows themselves.
        driveApplicationStatusHistoryRepository.deleteAllByApplication_Student_Id(studentId);
        driveApplicationRepository.deleteAllByStudent_Id(studentId);
        resumeDataRepository.deleteByStudent_Id(studentId);

        // Academics / course enrollment
        academicDetailsRepository.deleteByStudentId(studentId);
        enrollmentRepository.deleteAllByStudentId(studentId);

        // Quiz / gamification - keyed by User.id, not Student.id. Question
        // attempts reference the QuizAttempt, so they go first.
        questionAttemptRepository.deleteAllByAttempt_StudentId(userId);
        quizAttemptRepository.deleteAllByStudentId(userId);
        studentGameStatsRepository.deleteByStudentId(userId);
        studentAchievementRepository.deleteAllByStudentId(userId);

        // Recorded sessions - also keyed by User.id.
        playbackSessionRepository.deleteAllByStudentId(userId);

        // Notifications - keyed by User.id.
        notificationRepository.deleteAllByUser_Id(userId);

        // Finally, the account itself.
        studentRepository.delete(student);
        userRepository.delete(student.getUser());
    }

    private Student findOrThrow(Long id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + id));
    }

    private Batch findBatchOrThrow(Long batchId) {
        return batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + batchId));
    }

    private void assignBatch(Student student, Long batchId) {
        if (batchId == null) {
            student.setBatch(null);
            return;
        }
        Batch currentBatch = student.getBatch();
        if (currentBatch != null && currentBatch.getId().equals(batchId)) {
            return;
        }
        Batch batch = findBatchOrThrow(batchId);
        long currentCount = studentRepository.findByBatchId(batchId).size();
        if (currentCount >= batch.getMaxStudents()) {
            throw new ConflictException("Batch '" + batch.getName() + "' is full (" + batch.getMaxStudents() + " max)");
        }
        student.setBatch(batch);
    }

    private Course findCourseOrThrow(Long courseId) {
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));
    }

    private void applyRequest(Student student, StudentUpdateRequest request) {
        student.getUser().setName(request.getName());
        student.setPhone(request.getPhone());
        student.setPlacementStatus(request.getPlacementStatus());
        assignBatch(student, request.getBatchId());
        if (request.getCourseId() != null) {
            Course course = findCourseOrThrow(request.getCourseId());
            if (course.getStatus() != CourseStatus.PUBLISHED &&
                    (student.getCourse() == null || !student.getCourse().getId().equals(course.getId()))) {
                throw new BadRequestException("Cannot enroll student in course '" + course.getTitle() + "' because it is not PUBLISHED (current status: " + course.getStatus() + ")");
            }
            student.setCourse(course);
        } else {
            student.setCourse(null);
        }
    }

    /**
     * The student self-service "My Courses" page reads from the {@code enrollments}
     * table, not from {@code Student.course}. Setting a student's course from the
     * admin panel used to leave that table untouched, so the course an admin
     * assigned never actually showed up for the student. Whenever a student has a
     * course assigned, make sure a matching enrollment row exists so the admin's
     * assignment is reflected on the student side too. This only ever creates a
     * missing enrollment - it never removes one, so course history isn't lost if
     * an admin later clears/changes the course field.
     */
    private void syncCourseEnrollment(Student student) {
        Course course = student.getCourse();
        if (course == null) {
            return;
        }
        if (!enrollmentRepository.existsByStudentIdAndCourseId(student.getId(), course.getId())) {
            Enrollment enrollment = new Enrollment();
            enrollment.setStudent(student);
            enrollment.setCourse(course);
            enrollmentRepository.save(enrollment);
        }
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
