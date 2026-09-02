package com.careerlabs.lms.api.config;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.careerlabs.lms.api.academic.repository.AcademicDetailsRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementAcknowledgmentRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementCommentRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementTemplateRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementVersionRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementViewRepository;
import com.careerlabs.lms.api.assignment.repository.AssignmentRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceAlertRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceCorrectionRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceGoalRepository;
import com.careerlabs.lms.api.attendance.repository.AttendancePolicyRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.college.repository.CollegeRepository;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.material.repository.MaterialRepository;
import com.careerlabs.lms.api.notification.repository.NotificationRepository;
import com.careerlabs.lms.api.placement.repository.DriveApplicationRepository;
import com.careerlabs.lms.api.placement.repository.DriveRepository;
import com.careerlabs.lms.api.placement.repository.ResumeDataRepository;
import com.careerlabs.lms.api.quiz.repository.DailyChallengeRepository;
import com.careerlabs.lms.api.quiz.repository.InterviewQuestionRepository;
import com.careerlabs.lms.api.quiz.repository.QuestionAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuestionOptionRepository;
import com.careerlabs.lms.api.quiz.repository.QuestionRepository;
import com.careerlabs.lms.api.quiz.repository.QuizAssignmentRepository;
import com.careerlabs.lms.api.quiz.repository.QuizAttemptRepository;
import com.careerlabs.lms.api.quiz.repository.QuizQuestionRepository;
import com.careerlabs.lms.api.quiz.repository.QuizRepository;
import com.careerlabs.lms.api.quiz.repository.QuizTopicRepository;
import com.careerlabs.lms.api.quiz.repository.StudentAchievementRepository;
import com.careerlabs.lms.api.quiz.repository.StudentGameStatsRepository;
import com.careerlabs.lms.api.recordedsession.repository.PlaybackEventRepository;
import com.careerlabs.lms.api.recordedsession.repository.PlaybackSessionRepository;
import com.careerlabs.lms.api.recordedsession.repository.RecordedSessionAccessBlockRepository;
import com.careerlabs.lms.api.recordedsession.repository.RecordedSessionAssetRepository;
import com.careerlabs.lms.api.recordedsession.repository.RecordedSessionAuditLogRepository;
import com.careerlabs.lms.api.recordedsession.repository.RecordedSessionRepository;
import com.careerlabs.lms.api.session.repository.SessionRepository;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.submission.repository.AssignmentSubmissionRepository;
import com.careerlabs.lms.api.syllabus.repository.SyllabusModuleRepository;
import com.careerlabs.lms.api.syllabus.repository.SyllabusTopicRepository;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;

/**
 * Runner to purge all sample / seed data from the database when app.purge-sample-data is enabled.
 * Preserves active Admin accounts.
 */
@Component
@Order(0)
public class SampleDataPurgeRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SampleDataPurgeRunner.class);

    @Value("${app.purge-sample-data:false}")
    private boolean purgeEnabled;

    private final AttendanceCorrectionRepository attendanceCorrectionRepository;
    private final AttendanceAlertRepository attendanceAlertRepository;
    private final AttendanceGoalRepository attendanceGoalRepository;
    private final AttendanceRepository attendanceRepository;
    private final DailyClassRepository dailyClassRepository;
    private final AttendancePolicyRepository attendancePolicyRepository;

    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizAssignmentRepository quizAssignmentRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuizRepository quizRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final QuestionRepository questionRepository;
    private final QuizTopicRepository quizTopicRepository;
    private final InterviewQuestionRepository interviewQuestionRepository;
    private final QuestionAttemptRepository questionAttemptRepository;
    private final DailyChallengeRepository dailyChallengeRepository;

    private final AssignmentSubmissionRepository assignmentSubmissionRepository;
    private final AssignmentRepository assignmentRepository;

    private final DriveApplicationRepository driveApplicationRepository;
    private final DriveRepository driveRepository;
    private final ResumeDataRepository resumeDataRepository;

    private final AnnouncementAcknowledgmentRepository announcementAcknowledgmentRepository;
    private final AnnouncementCommentRepository announcementCommentRepository;
    private final AnnouncementViewRepository announcementViewRepository;
    private final AnnouncementVersionRepository announcementVersionRepository;
    private final AnnouncementRepository announcementRepository;
    private final AnnouncementTemplateRepository announcementTemplateRepository;

    private final StudentGameStatsRepository studentGameStatsRepository;
    private final StudentAchievementRepository studentAchievementRepository;
    private final NotificationRepository notificationRepository;

    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;
    private final AcademicDetailsRepository academicDetailsRepository;
    private final BatchRepository batchRepository;

    private final PlaybackEventRepository playbackEventRepository;
    private final PlaybackSessionRepository playbackSessionRepository;
    private final RecordedSessionAccessBlockRepository recordedSessionAccessBlockRepository;
    private final RecordedSessionAssetRepository recordedSessionAssetRepository;
    private final RecordedSessionAuditLogRepository recordedSessionAuditLogRepository;
    private final RecordedSessionRepository recordedSessionRepository;

    private final SyllabusTopicRepository syllabusTopicRepository;
    private final SyllabusModuleRepository syllabusModuleRepository;
    private final SessionRepository sessionRepository;
    private final MaterialRepository materialRepository;
    private final CourseRepository courseRepository;
    private final CollegeRepository collegeRepository;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public SampleDataPurgeRunner(
            AttendanceCorrectionRepository attendanceCorrectionRepository,
            AttendanceAlertRepository attendanceAlertRepository,
            AttendanceGoalRepository attendanceGoalRepository,
            AttendanceRepository attendanceRepository,
            DailyClassRepository dailyClassRepository,
            AttendancePolicyRepository attendancePolicyRepository,
            QuizAttemptRepository quizAttemptRepository,
            QuizAssignmentRepository quizAssignmentRepository,
            QuizQuestionRepository quizQuestionRepository,
            QuizRepository quizRepository,
            QuestionOptionRepository questionOptionRepository,
            QuestionRepository questionRepository,
            QuizTopicRepository quizTopicRepository,
            InterviewQuestionRepository interviewQuestionRepository,
            QuestionAttemptRepository questionAttemptRepository,
            DailyChallengeRepository dailyChallengeRepository,
            AssignmentSubmissionRepository assignmentSubmissionRepository,
            AssignmentRepository assignmentRepository,
            DriveApplicationRepository driveApplicationRepository,
            DriveRepository driveRepository,
            ResumeDataRepository resumeDataRepository,
            AnnouncementAcknowledgmentRepository announcementAcknowledgmentRepository,
            AnnouncementCommentRepository announcementCommentRepository,
            AnnouncementViewRepository announcementViewRepository,
            AnnouncementVersionRepository announcementVersionRepository,
            AnnouncementRepository announcementRepository,
            AnnouncementTemplateRepository announcementTemplateRepository,
            StudentGameStatsRepository studentGameStatsRepository,
            StudentAchievementRepository studentAchievementRepository,
            NotificationRepository notificationRepository,
            EnrollmentRepository enrollmentRepository,
            StudentRepository studentRepository,
            AcademicDetailsRepository academicDetailsRepository,
            BatchRepository batchRepository,
            PlaybackEventRepository playbackEventRepository,
            PlaybackSessionRepository playbackSessionRepository,
            RecordedSessionAccessBlockRepository recordedSessionAccessBlockRepository,
            RecordedSessionAssetRepository recordedSessionAssetRepository,
            RecordedSessionAuditLogRepository recordedSessionAuditLogRepository,
            RecordedSessionRepository recordedSessionRepository,
            SyllabusTopicRepository syllabusTopicRepository,
            SyllabusModuleRepository syllabusModuleRepository,
            SessionRepository sessionRepository,
            MaterialRepository materialRepository,
            CourseRepository courseRepository,
            CollegeRepository collegeRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.attendanceCorrectionRepository = attendanceCorrectionRepository;
        this.attendanceAlertRepository = attendanceAlertRepository;
        this.attendanceGoalRepository = attendanceGoalRepository;
        this.attendanceRepository = attendanceRepository;
        this.dailyClassRepository = dailyClassRepository;
        this.attendancePolicyRepository = attendancePolicyRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.quizAssignmentRepository = quizAssignmentRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.quizRepository = quizRepository;
        this.questionOptionRepository = questionOptionRepository;
        this.questionRepository = questionRepository;
        this.quizTopicRepository = quizTopicRepository;
        this.interviewQuestionRepository = interviewQuestionRepository;
        this.questionAttemptRepository = questionAttemptRepository;
        this.dailyChallengeRepository = dailyChallengeRepository;
        this.assignmentSubmissionRepository = assignmentSubmissionRepository;
        this.assignmentRepository = assignmentRepository;
        this.driveApplicationRepository = driveApplicationRepository;
        this.driveRepository = driveRepository;
        this.resumeDataRepository = resumeDataRepository;
        this.announcementAcknowledgmentRepository = announcementAcknowledgmentRepository;
        this.announcementCommentRepository = announcementCommentRepository;
        this.announcementViewRepository = announcementViewRepository;
        this.announcementVersionRepository = announcementVersionRepository;
        this.announcementRepository = announcementRepository;
        this.announcementTemplateRepository = announcementTemplateRepository;
        this.studentGameStatsRepository = studentGameStatsRepository;
        this.studentAchievementRepository = studentAchievementRepository;
        this.notificationRepository = notificationRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.studentRepository = studentRepository;
        this.academicDetailsRepository = academicDetailsRepository;
        this.batchRepository = batchRepository;
        this.playbackEventRepository = playbackEventRepository;
        this.playbackSessionRepository = playbackSessionRepository;
        this.recordedSessionAccessBlockRepository = recordedSessionAccessBlockRepository;
        this.recordedSessionAssetRepository = recordedSessionAssetRepository;
        this.recordedSessionAuditLogRepository = recordedSessionAuditLogRepository;
        this.recordedSessionRepository = recordedSessionRepository;
        this.syllabusTopicRepository = syllabusTopicRepository;
        this.syllabusModuleRepository = syllabusModuleRepository;
        this.sessionRepository = sessionRepository;
        this.materialRepository = materialRepository;
        this.courseRepository = courseRepository;
        this.collegeRepository = collegeRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Sample data purge enabled: {}", purgeEnabled);
        if (!purgeEnabled) {
            return;
        }

        log.info("Purging all sample/seed data from backend database...");

        try {
            attendanceCorrectionRepository.deleteAllInBatch();
            attendanceAlertRepository.deleteAllInBatch();
            attendanceGoalRepository.deleteAllInBatch();
            attendanceRepository.deleteAllInBatch();
            dailyClassRepository.deleteAllInBatch();
            attendancePolicyRepository.deleteAllInBatch();

            dailyChallengeRepository.deleteAllInBatch();
            questionAttemptRepository.deleteAllInBatch();
            quizAttemptRepository.deleteAllInBatch();
            quizAssignmentRepository.deleteAllInBatch();
            quizQuestionRepository.deleteAllInBatch();
            quizRepository.deleteAllInBatch();
            questionOptionRepository.deleteAllInBatch();
            questionRepository.deleteAllInBatch();
            quizTopicRepository.deleteAllInBatch();
            interviewQuestionRepository.deleteAllInBatch();

            assignmentSubmissionRepository.deleteAllInBatch();
            assignmentRepository.deleteAllInBatch();

            driveApplicationRepository.deleteAllInBatch();
            driveRepository.deleteAllInBatch();
            resumeDataRepository.deleteAllInBatch();

            announcementAcknowledgmentRepository.deleteAllInBatch();
            announcementCommentRepository.deleteAllInBatch();
            announcementViewRepository.deleteAllInBatch();
            announcementVersionRepository.deleteAllInBatch();
            announcementRepository.deleteAllInBatch();
            announcementTemplateRepository.deleteAllInBatch();

            studentGameStatsRepository.deleteAllInBatch();
            studentAchievementRepository.deleteAllInBatch();
            notificationRepository.deleteAllInBatch();

            academicDetailsRepository.deleteAllInBatch();
            enrollmentRepository.deleteAllInBatch();
            studentRepository.deleteAllInBatch();
            collegeRepository.deleteAllInBatch();
            batchRepository.deleteAllInBatch();

            playbackEventRepository.deleteAllInBatch();
            playbackSessionRepository.deleteAllInBatch();
            recordedSessionAccessBlockRepository.deleteAllInBatch();
            recordedSessionAssetRepository.deleteAllInBatch();
            recordedSessionAuditLogRepository.deleteAllInBatch();
            recordedSessionRepository.deleteAllInBatch();

            sessionRepository.deleteAllInBatch();
            materialRepository.deleteAllInBatch();
            syllabusTopicRepository.deleteAllInBatch();
            syllabusModuleRepository.deleteAllInBatch();
            courseRepository.deleteAllInBatch();

            // Retain or recreate active Super Admin, Admin, and Student system accounts
            List<User> users = userRepository.findAll();
            for (User u : users) {
                if (!u.getEmail().equalsIgnoreCase("superadmin@careerlabs.com") &&
                    !u.getEmail().equalsIgnoreCase("admin@careerlabs.com") &&
                    !u.getEmail().equalsIgnoreCase("student@careerlabs.com")) {
                    userRepository.delete(u);
                }
            }

            if (userRepository.findByEmailIgnoreCase("superadmin@careerlabs.com").isEmpty()) {
                User superAdmin = new User();
                superAdmin.setName("Super Admin");
                superAdmin.setEmail("superadmin@careerlabs.com");
                superAdmin.setPasswordHash(passwordEncoder.encode("ChangeMe123!"));
                superAdmin.setRole(Role.ADMIN);
                userRepository.save(superAdmin);
            }

            if (userRepository.findByEmailIgnoreCase("admin@careerlabs.com").isEmpty()) {
                User admin = new User();
                admin.setName("Admin User");
                admin.setEmail("admin@careerlabs.com");
                admin.setPasswordHash(passwordEncoder.encode("ChangeMe123!"));
                admin.setRole(Role.ADMIN);
                userRepository.save(admin);
            }

            User studentUser = userRepository.findByEmailIgnoreCase("student@careerlabs.com")
                    .orElseGet(() -> {
                        User s = new User();
                        s.setName("Demo Student");
                        s.setEmail("student@careerlabs.com");
                        s.setPasswordHash(passwordEncoder.encode("ChangeMe123!"));
                        s.setRole(Role.STUDENT);
                        return userRepository.save(s);
                    });

            if (studentRepository.findByUserId(studentUser.getId()).isEmpty()) {
                Student studentProfile = new Student();
                studentProfile.setUser(studentUser);
                studentProfile.setEnrollmentNo("STU001");
                studentRepository.save(studentProfile);
            }

            log.info("Successfully purged all sample data. Database is now clean with Admin User account ready.");
        } catch (Exception e) {
            log.error("Failed to purge sample data: {}", e.getMessage(), e);
        }
    }
}
