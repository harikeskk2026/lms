package com.careerlabs.lms.api.announcement.service.impl;

import com.careerlabs.lms.api.announcement.entity.Announcement;
import com.careerlabs.lms.api.announcement.entity.AudienceRuleType;
import com.careerlabs.lms.api.announcement.service.AnnouncementAudienceService;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.student.entity.PlacementStatus;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.submission.repository.AssignmentSubmissionRepository;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class AnnouncementAudienceServiceImpl implements AnnouncementAudienceService {

    private static final Logger log = LoggerFactory.getLogger(AnnouncementAudienceServiceImpl.class);

    private final StudentRepository studentRepository;
    private final AttendanceRepository attendanceRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final EnrollmentRepository enrollmentRepository;

    @Autowired
    public AnnouncementAudienceServiceImpl(StudentRepository studentRepository,
                                            AttendanceRepository attendanceRepository,
                                            AssignmentSubmissionRepository submissionRepository,
                                            EnrollmentRepository enrollmentRepository) {
        this.studentRepository = studentRepository;
        this.attendanceRepository = attendanceRepository;
        this.submissionRepository = submissionRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    public AnnouncementAudienceServiceImpl(StudentRepository studentRepository,
                                            AttendanceRepository attendanceRepository,
                                            AssignmentSubmissionRepository submissionRepository) {
        this(studentRepository, attendanceRepository, submissionRepository, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Student> resolveEligibleStudents(Announcement announcement) {
        Specification<Student> spec = buildStructuralSpec(announcement);
        List<Student> candidates = studentRepository.findAll(spec);
        List<Student> eligible = new ArrayList<>();
        for (Student s : candidates) {
            if (matchesRule(announcement, s)) {
                eligible.add(s);
            }
        }
        return eligible;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isEligible(Announcement announcement, Student student) {
        try {
            List<Long> targetBatchIds = announcement.getBatchIds();
            if (targetBatchIds != null && !targetBatchIds.isEmpty()) {
                boolean batchEnrolled = enrollmentRepository != null && student.getId() != null
                        && targetBatchIds.stream().anyMatch(bId -> enrollmentRepository.existsByStudentIdAndBatchIdAndActiveTrue(student.getId(), bId));
                if (!batchEnrolled) {
                    return false;
                }
            }
            if (announcement.getCollege() != null) {
                if (student.getCollege() == null || !student.getCollege().getId().equals(announcement.getCollege().getId())) {
                    return false;
                }
            }
            List<Long> targetCourseIds = announcement.getCourseIds();
            if (targetCourseIds != null && !targetCourseIds.isEmpty()) {
                boolean directMatch = student.getCourse() != null && targetCourseIds.contains(student.getCourse().getId());
                boolean enrollmentMatch = enrollmentRepository != null && student.getId() != null
                        && targetCourseIds.stream().anyMatch(cId -> enrollmentRepository.existsByStudentIdAndCourseIdAndActiveTrue(student.getId(), cId));
                if (!directMatch && !enrollmentMatch) {
                    return false;
                }
            }
            return matchesRule(announcement, student);
        } catch (Exception e) {
            log.warn("Failed audience eligibility check for announcement {} and student {}: {}",
                    announcement != null ? announcement.getId() : null,
                    student != null ? student.getId() : null,
                    e.getMessage(), e);
            // Fail closed: an audience-resolution failure must deny access, never grant it.
            return false;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isUserEligible(Announcement announcement, Long userId) {
        try {
            if (userId == null) {
                return false;
            }
            return studentRepository.findByUserId(userId)
                    .map(student -> isEligible(announcement, student))
                    .orElse(false);
        } catch (Exception e) {
            log.warn("Failed audience user eligibility check for announcement {} and userId {}: {}",
                    announcement != null ? announcement.getId() : null,
                    userId,
                    e.getMessage(), e);
            // Fail closed: an audience-resolution failure must deny access, never grant it.
            return false;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public long countEligibleStudents(Announcement announcement) {
        if (announcement == null) {
            return 0;
        }
        return resolveEligibleStudents(announcement).size();
    }

    private Specification<Student> buildStructuralSpec(Announcement a) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            List<Long> targetBatchIds = a.getBatchIds();
            if (targetBatchIds != null && !targetBatchIds.isEmpty()) {
                List<Long> enrolledStudentIds = enrollmentRepository != null
                        ? enrollmentRepository.findActiveStudentIdsByBatchIdIn(targetBatchIds)
                        : List.of();
                if (enrolledStudentIds != null && !enrolledStudentIds.isEmpty()) {
                    predicates.add(root.get("id").in(enrolledStudentIds));
                } else {
                    predicates.add(cb.disjunction());
                }
            }
            if (a.getCollege() != null) {
                predicates.add(cb.equal(root.get("college").get("id"), a.getCollege().getId()));
            }
            List<Long> targetCourseIds = a.getCourseIds();
            if (targetCourseIds != null && !targetCourseIds.isEmpty()) {
                Predicate directCourse = root.get("course").get("id").in(targetCourseIds);
                List<Long> enrolledStudentIds = enrollmentRepository != null
                        ? enrollmentRepository.findActiveStudentIdsByCourseIdIn(targetCourseIds)
                        : List.of();
                if (enrolledStudentIds != null && !enrolledStudentIds.isEmpty()) {
                    predicates.add(cb.or(directCourse, root.get("id").in(enrolledStudentIds)));
                } else {
                    predicates.add(directCourse);
                }
            }
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private boolean matchesRule(Announcement a, Student student) {
        AudienceRuleType rule = a.getAudienceRuleType();
        if (rule == null || rule == AudienceRuleType.NONE) {
            return true;
        }
        return switch (rule) {
            case ATTENDANCE_BELOW -> attendanceBelow(student, a.getAudienceRuleValue());
            case ASSIGNMENT_NOT_SUBMITTED -> assignmentNotSubmitted(student, a.getAudienceRuleReferenceId());
            case PLACEMENT_ELIGIBLE -> student.getPlacementStatus() == PlacementStatus.SEEKING;
            case NONE -> true;
        };
    }

    private boolean attendanceBelow(Student student, Double thresholdPercent) {
        if (thresholdPercent == null) {
            return false;
        }
        long total = attendanceRepository.countByStudentId(student.getId());
        if (total == 0) {
            return false;
        }
        long present = attendanceRepository.countByStudentIdAndStatus(student.getId(), AttendStatus.PRESENT);
        double percentage = present * 100.0 / total;
        return percentage < thresholdPercent;
    }

    private boolean assignmentNotSubmitted(Student student, Long assignmentId) {
        if (assignmentId == null) {
            return false;
        }
        return submissionRepository.findByAssignmentIdAndStudentId(assignmentId, student.getId()).isEmpty();
    }
}
