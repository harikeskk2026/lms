package com.careerlabs.lms.api.config;

import com.careerlabs.lms.api.announcement.repository.*;
import com.careerlabs.lms.api.assignment.repository.AssignmentRepository;
import com.careerlabs.lms.api.attendance.repository.*;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.college.repository.CollegeRepository;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.material.repository.MaterialRepository;
import com.careerlabs.lms.api.notification.repository.NotificationRepository;
import com.careerlabs.lms.api.placement.repository.DriveApplicationRepository;
import com.careerlabs.lms.api.placement.repository.DriveRepository;
import com.careerlabs.lms.api.placement.repository.ResumeDataRepository;
import com.careerlabs.lms.api.quiz.repository.*;
import com.careerlabs.lms.api.session.repository.SessionRepository;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.submission.repository.AssignmentSubmissionRepository;
import com.careerlabs.lms.api.syllabus.repository.SyllabusModuleRepository;
import com.careerlabs.lms.api.syllabus.repository.SyllabusTopicRepository;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Runner to purge all sample / seed data from the database when app.seed.enabled is false
 * or when app.purge-sample-data is enabled. Preserves active Admin accounts.
 */
@Component
@Order(0)
public class SampleDataPurgeRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SampleDataPurgeRunner.class);

    @Value("${app.seed.enabled:false}")
    private boolean seedEnabled;

    @Value("${app.purge-sample-data:true}")
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
    private final BatchRepository batchRepository;

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
            BatchRepository batchRepository,
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
        this.batchRepository = batchRepository;
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
        if (seedEnabled || !purgeEnabled) {
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

            quizAttemptRepository.deleteAllInBatch();
            quizAssignmentRepository.deleteAllInBatch();
            quizQuestionRepository.deleteAllInBatch();
            quizRepository.deleteAllInBatch();
            questionAttemptRepository.deleteAllInBatch();
            questionOptionRepository.deleteAllInBatch();
            questionRepository.deleteAllInBatch();
            quizTopicRepository.deleteAllInBatch();
            interviewQuestionRepository.deleteAllInBatch();
            dailyChallengeRepository.deleteAllInBatch();

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

            enrollmentRepository.deleteAllInBatch();
            studentRepository.deleteAllInBatch();
            batchRepository.deleteAllInBatch();

            syllabusTopicRepository.deleteAllInBatch();
            syllabusModuleRepository.deleteAllInBatch();
            sessionRepository.deleteAllInBatch();
            materialRepository.deleteAllInBatch();
            courseRepository.deleteAllInBatch();
            collegeRepository.deleteAllInBatch();

            // Retain or recreate active Admin user
            List<User> users = userRepository.findAll();
            for (User u : users) {
                if (u.getRole() != Role.ADMIN) {
                    userRepository.delete(u);
                }
            }

            if (userRepository.count() == 0) {
                User admin = new User();
                admin.setName("Admin User");
                admin.setEmail("admin@careerlabs.com");
                admin.setPasswordHash(passwordEncoder.encode("ChangeMe123!"));
                admin.setRole(Role.ADMIN);
                userRepository.save(admin);
            }

            log.info("Successfully purged all sample data. Database is now clean with Admin User account ready.");
        } catch (Exception e) {
            log.error("Failed to purge sample data: {}", e.getMessage(), e);
        }
    }
}
