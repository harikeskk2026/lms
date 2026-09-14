package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.enrollment.entity.Enrollment;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.quiz.entity.Quiz;
import com.careerlabs.lms.api.quiz.entity.QuizAssignment;
import com.careerlabs.lms.api.quiz.entity.QuizEffectiveStatus;
import com.careerlabs.lms.api.quiz.entity.QuizStatus;
import com.careerlabs.lms.api.quiz.repository.QuizAssignmentRepository;
import com.careerlabs.lms.api.quiz.service.QuizAvailabilityService;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class QuizAvailabilityServiceImpl implements QuizAvailabilityService {

    private final QuizAssignmentRepository quizAssignmentRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;

    public QuizAvailabilityServiceImpl(QuizAssignmentRepository quizAssignmentRepository,
                                       StudentRepository studentRepository,
                                       EnrollmentRepository enrollmentRepository) {
        this.quizAssignmentRepository = quizAssignmentRepository;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    @Override
    public QuizEffectiveStatus effectiveStatus(Quiz quiz) {
        if (quiz.getStatus() == QuizStatus.DRAFT) {
            return QuizEffectiveStatus.DRAFT;
        }
        if (quiz.getStatus() == QuizStatus.ARCHIVED) {
            return QuizEffectiveStatus.ARCHIVED;
        }
        LocalDateTime now = LocalDateTime.now();
        if (quiz.getScheduledStart() != null && now.isBefore(quiz.getScheduledStart())) {
            return QuizEffectiveStatus.SCHEDULED;
        }
        if (quiz.getScheduledEnd() != null && now.isAfter(quiz.getScheduledEnd())) {
            return QuizEffectiveStatus.COMPLETED;
        }
        return QuizEffectiveStatus.LIVE;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isAssignedTo(Quiz quiz, Long studentUserId) {
        List<QuizAssignment> assignments = quizAssignmentRepository.findByQuizId(quiz.getId());

        if (assignments.isEmpty()) {
            if (quiz.getCreatedBy() != null && quiz.getTitle() != null
                    && quiz.getTitle().toLowerCase().contains("practice")) {
                return quiz.getCreatedBy().equals(studentUserId);
            }
            return false;
        }

        Student student = studentRepository.findByUserId(studentUserId).orElse(null);
        if (student == null) {
            return false;
        }

        Set<Long> studentBatchIds = new HashSet<>();
        Set<Long> studentCourseIds = new HashSet<>();
        if (student.getCourse() != null) {
            studentCourseIds.add(student.getCourse().getId());
        }

        List<Enrollment> enrollments = enrollmentRepository
                .findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(student.getId());
        for (Enrollment e : enrollments) {
            if (e.getBatch() != null) {
                studentBatchIds.add(e.getBatch().getId());
            }
            if (e.getCourse() != null) {
                studentCourseIds.add(e.getCourse().getId());
            }
        }

        for (QuizAssignment a : assignments) {
            boolean matches = switch (a.getTargetType()) {
                case BATCH -> studentBatchIds.contains(a.getTargetId());
                case COURSE -> studentCourseIds.contains(a.getTargetId());
                case STUDENT -> a.getTargetId().equals(studentUserId);
            };
            if (matches) {
                return true;
            }
        }
        return false;
    }
}
