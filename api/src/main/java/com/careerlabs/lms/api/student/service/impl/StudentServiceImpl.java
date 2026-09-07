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
import com.careerlabs.lms.api.college.entity.College;
import com.careerlabs.lms.api.college.repository.CollegeRepository;
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
import org.springframework.transaction.annotation.Transactional;
import com.careerlabs.lms.api.common.util.CsvParser;
import com.careerlabs.lms.api.student.dto.response.StudentBulkImportResponse;
import com.careerlabs.lms.api.student.dto.response.StudentImportError;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Year;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class StudentServiceImpl implements StudentService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final BatchRepository batchRepository;
    private final CourseRepository courseRepository;
    private final CollegeRepository collegeRepository;
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
    private final TransactionTemplate transactionTemplate;

    public StudentServiceImpl(StudentRepository studentRepository, UserRepository userRepository,
                               BatchRepository batchRepository, CourseRepository courseRepository,
                               CollegeRepository collegeRepository,
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
                               NotificationRepository notificationRepository,
                               PlatformTransactionManager transactionManager) {
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.batchRepository = batchRepository;
        this.courseRepository = courseRepository;
        this.collegeRepository = collegeRepository;
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
        this.transactionTemplate = new TransactionTemplate(transactionManager);
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

    private College findOrCreateCollege(String name) {
        return collegeRepository.findByNameIgnoreCase(name.trim())
                .orElseGet(() -> {
                    College c = new College();
                    c.setName(name.trim());
                    return collegeRepository.save(c);
                });
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

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9._%+-]+@(?!\\d+(?:\\.\\d+)*\\.[A-Za-z]{2,}$)[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private static final Pattern PHONE_PATTERN =
            Pattern.compile("^[6-9]\\d{9}$");

    @Override
    public StudentBulkImportResponse bulkImport(MultipartFile file, boolean enrollImportedStudents,
                                                Long defaultCourseId, Long defaultBatchId) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Uploaded CSV file is empty");
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            throw new BadRequestException("CSV file size exceeds the 5MB limit");
        }

        CsvParser.ParseResult parseResult;
        try {
            parseResult = CsvParser.parse(file.getInputStream());
        } catch (IOException e) {
            throw new BadRequestException("Failed to read CSV file: " + e.getMessage());
        }

        List<CsvParser.ParsedRow> rows = parseResult.getRows();
        if (rows.isEmpty()) {
            throw new BadRequestException("CSV file contains no student data rows");
        }

        if (rows.size() > 1000) {
            throw new BadRequestException("CSV file exceeds maximum limit of 1000 rows");
        }

        // Verify required headers (Name and Email must be present)
        boolean hasNameHeader = parseResult.getHeaders().stream()
                .map(CsvParser::normalizeHeaderKey)
                .anyMatch(h -> h.contains("name"));
        boolean hasEmailHeader = parseResult.getHeaders().stream()
                .map(CsvParser::normalizeHeaderKey)
                .anyMatch(h -> h.contains("email"));

        if (!hasNameHeader || !hasEmailHeader) {
            throw new BadRequestException("CSV file must contain 'Name' and 'Email' columns");
        }

        // Resolve default course and batch if enrollment is enabled
        Course defaultCourse = null;
        Batch defaultBatch = null;

        if (enrollImportedStudents) {
            if (defaultCourseId != null) {
                defaultCourse = findCourseOrThrow(defaultCourseId);
                if (defaultCourse.getStatus() != CourseStatus.PUBLISHED) {
                    throw new BadRequestException("Default course '" + defaultCourse.getTitle() + "' is not PUBLISHED (current status: " + defaultCourse.getStatus() + ")");
                }
            }
            if (defaultBatchId != null) {
                defaultBatch = findBatchOrThrow(defaultBatchId);
                if (defaultCourse != null && !defaultBatch.getCourse().getId().equals(defaultCourse.getId())) {
                    throw new BadRequestException("Default batch '" + defaultBatch.getName() + "' does not belong to default course '" + defaultCourse.getTitle() + "'");
                }
            }
        }

        Set<String> seenEmailsInCsv = new HashSet<>();
        Map<Long, Integer> batchCapacityTracker = new HashMap<>();

        List<StudentResponse> importedStudents = new ArrayList<>();
        List<StudentImportError> errors = new ArrayList<>();
        int enrolledCount = 0;

        for (CsvParser.ParsedRow row : rows) {
            int rowNum = row.getRowNumber();

            // 1. Name validation
            String name = row.get("name", "studentname", "fullname", "student_name");
            if (name == null || name.trim().length() < 2 || name.trim().length() > 150) {
                errors.add(new StudentImportError(rowNum, name != null ? name : "", "", "Name is required (2 to 150 characters)"));
                continue;
            }
            name = name.trim();

            // 2. Email validation
            String rawEmail = row.get("email", "studentemail", "emailaddress", "student_email");
            if (rawEmail == null || rawEmail.trim().isEmpty()) {
                errors.add(new StudentImportError(rowNum, name, "", "Email is required"));
                continue;
            }
            String email = rawEmail.trim().toLowerCase(Locale.ROOT);
            if (!isValidEmailFormat(email)) {
                errors.add(new StudentImportError(rowNum, name, email, "Invalid email address format"));
                continue;
            }
            if (!seenEmailsInCsv.add(email)) {
                errors.add(new StudentImportError(rowNum, name, email, "Duplicate email '" + email + "' found within this CSV sheet"));
                continue;
            }
            if (userRepository.existsByEmailIgnoreCase(email)) {
                errors.add(new StudentImportError(rowNum, name, email, "Email '" + email + "' is already registered in the system"));
                continue;
            }

            // 3. Phone validation
            String phone = row.get("phone", "phonenumber", "mobile", "contact", "mobile_number");
            if (phone != null) {
                phone = phone.replaceAll("\\D", "").trim();
                if (phone.isEmpty()) {
                    phone = null;
                } else if (!PHONE_PATTERN.matcher(phone).matches()) {
                    errors.add(new StudentImportError(rowNum, name, email, "Phone number must be a valid 10-digit number starting with 6-9"));
                    continue;
                }
            }

            // 4. Password validation
            String password = row.get("password");
            if (password == null || password.trim().isEmpty()) {
                password = "Student@123";
            } else {
                password = password.trim();
                if (!isValidPasswordStrength(password)) {
                    errors.add(new StudentImportError(rowNum, name, email, "Password must be 8-128 characters and contain at least one uppercase letter, one lowercase letter, one digit, and one special character (no spaces)"));
                    continue;
                }
            }

            // 5. Placement Status validation
            String rawPlacement = row.get("placementstatus", "placement_status", "placement", "status");
            PlacementStatus placementStatus = PlacementStatus.SEEKING;
            if (rawPlacement != null && !rawPlacement.isBlank()) {
                try {
                    placementStatus = PlacementStatus.valueOf(rawPlacement.trim().toUpperCase(Locale.ROOT));
                } catch (IllegalArgumentException e) {
                    errors.add(new StudentImportError(rowNum, name, email, "Invalid placement status '" + rawPlacement + "'. Allowed: SEEKING, INTERVIEWING, PLACED, NOT_SEEKING"));
                    continue;
                }
            }

            // 6. Enrollment / Course / Batch resolution
            Course resolvedCourse = null;
            Batch resolvedBatch = null;

            if (enrollImportedStudents) {
                String courseVal = row.get("course", "coursetitle", "coursename", "courseid", "course_id");
                if (courseVal != null && !courseVal.isBlank()) {
                    resolvedCourse = resolveCourse(courseVal.trim());
                    if (resolvedCourse == null) {
                        errors.add(new StudentImportError(rowNum, name, email, "Course '" + courseVal + "' not found"));
                        continue;
                    }
                } else if (defaultCourse != null) {
                    resolvedCourse = defaultCourse;
                } else {
                    errors.add(new StudentImportError(rowNum, name, email, "Course is required when enrollment is enabled"));
                    continue;
                }

                // Check PUBLISHED status
                if (resolvedCourse.getStatus() != CourseStatus.PUBLISHED) {
                    errors.add(new StudentImportError(rowNum, name, email, "Cannot enroll student in course '" + resolvedCourse.getTitle() + "' because it is not PUBLISHED (current status: " + resolvedCourse.getStatus() + ")"));
                    continue;
                }

                // Batch resolution (optional)
                String batchVal = row.get("batch", "batchname", "batchid", "batch_id");
                if (batchVal != null && !batchVal.isBlank()) {
                    resolvedBatch = resolveBatch(batchVal.trim(), resolvedCourse.getId());
                    if (resolvedBatch == null) {
                        errors.add(new StudentImportError(rowNum, name, email, "Batch '" + batchVal + "' not found"));
                        continue;
                    }
                } else if (defaultBatch != null) {
                    resolvedBatch = defaultBatch;
                }

                if (resolvedBatch != null) {
                    // Check batch belongs to resolved course
                    if (!resolvedBatch.getCourse().getId().equals(resolvedCourse.getId())) {
                        errors.add(new StudentImportError(rowNum, name, email, "Batch '" + resolvedBatch.getName() + "' does not belong to course '" + resolvedCourse.getTitle() + "'"));
                        continue;
                    }

                    // Check batch capacity taking into account seats already assigned in this import
                    Long bId = resolvedBatch.getId();
                    int currentCount = batchCapacityTracker.computeIfAbsent(bId, id -> (int) studentRepository.countByBatchId(id));
                    if (currentCount >= resolvedBatch.getMaxStudents()) {
                        errors.add(new StudentImportError(rowNum, name, email, "Batch '" + resolvedBatch.getName() + "' is full (" + resolvedBatch.getMaxStudents() + " max capacity)"));
                        continue;
                    }
                }
            }

            // Tentatively reserve batch seat
            if (resolvedBatch != null) {
                batchCapacityTracker.put(resolvedBatch.getId(), batchCapacityTracker.get(resolvedBatch.getId()) + 1);
            }

            // Persist student in isolated transaction
            final String fName = name;
            final String fEmail = email;
            final String fPhone = phone;
            final String fPassword = password;
            final PlacementStatus fPlacement = placementStatus;
            final Long fCourseId = resolvedCourse != null ? resolvedCourse.getId() : null;
            final Long fBatchId = resolvedBatch != null ? resolvedBatch.getId() : null;

            try {
                StudentResponse created = transactionTemplate.execute(status -> {
                    User user = new User();
                    user.setName(fName);
                    user.setEmail(fEmail);
                    user.setPasswordHash(passwordEncoder.encode(fPassword));
                    user.setRole(Role.STUDENT);
                    user.setActive(true);
                    user = userRepository.save(user);

                    Student student = new Student();
                    student.setUser(user);
                    student.setPhone(fPhone);
                    student.setEnrollmentNo(generateEnrollmentNo(user.getId()));
                    student.setPlacementStatus(fPlacement);

                    Course courseToAttach = null;
                    if (fCourseId != null) {
                        courseToAttach = courseRepository.findById(fCourseId).orElse(null);
                        student.setCourse(courseToAttach);
                    }
                    if (fBatchId != null) {
                        Batch batchToAttach = batchRepository.findById(fBatchId).orElse(null);
                        student.setBatch(batchToAttach);
                    }
                    student = studentRepository.save(student);

                    if (courseToAttach != null) {
                        syncCourseEnrollment(student);
                    }

                    return StudentResponse.from(student);
                });

                if (created != null) {
                    importedStudents.add(created);
                    if (fCourseId != null) {
                        enrolledCount++;
                    }
                }
            } catch (Exception ex) {
                if (resolvedBatch != null) {
                    // Release reserved seat if saving failed
                    batchCapacityTracker.put(resolvedBatch.getId(), batchCapacityTracker.get(resolvedBatch.getId()) - 1);
                }
                errors.add(new StudentImportError(rowNum, fName, fEmail, "Failed to create student: " + ex.getMessage()));
            }
        }

        return new StudentBulkImportResponse(rows.size(), importedStudents.size(), errors.size(), enrolledCount, importedStudents, errors);
    }

    private Course resolveCourse(String val) {
        if (val == null || val.isBlank()) return null;
        if (val.matches("^\\d+$")) {
            try {
                Long id = Long.parseLong(val);
                Optional<Course> byId = courseRepository.findById(id);
                if (byId.isPresent()) return byId.get();
            } catch (NumberFormatException ignored) {}
        }
        Optional<Course> byTitle = courseRepository.findByTitleIgnoreCase(val);
        if (byTitle.isPresent()) return byTitle.get();
        return courseRepository.findBySlug(val.toLowerCase(Locale.ROOT).replace(" ", "-")).orElse(null);
    }

    private Batch resolveBatch(String val, Long courseId) {
        if (val == null || val.isBlank()) return null;
        if (val.matches("^\\d+$")) {
            try {
                Long id = Long.parseLong(val);
                Optional<Batch> byId = batchRepository.findWithCourseById(id);
                if (byId.isPresent()) return byId.get();
            } catch (NumberFormatException ignored) {}
        }
        List<Batch> byName = batchRepository.findByNameIgnoreCase(val);
        if (byName.isEmpty()) return null;
        if (courseId != null) {
            for (Batch b : byName) {
                if (b.getCourse() != null && b.getCourse().getId().equals(courseId)) {
                    return b;
                }
            }
        }
        return byName.get(0);
    }

    private boolean isValidEmailFormat(String email) {
        if (email == null || email.isBlank() || email.contains("..")) return false;
        return EMAIL_PATTERN.matcher(email).matches();
    }

    private boolean isValidPasswordStrength(String value) {
        if (value == null || value.length() < 8 || value.length() > 128) return false;
        boolean hasUpper = false, hasLower = false, hasDigit = false, hasSpecial = false;
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (Character.isWhitespace(c)) return false;
            if (Character.isUpperCase(c)) hasUpper = true;
            else if (Character.isLowerCase(c)) hasLower = true;
            else if (Character.isDigit(c)) hasDigit = true;
            else hasSpecial = true;
        }
        return hasUpper && hasLower && hasDigit && hasSpecial;
    }
}
