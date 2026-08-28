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
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class AnnouncementAudienceServiceImpl implements AnnouncementAudienceService {

    private final StudentRepository studentRepository;
    private final AttendanceRepository attendanceRepository;
    private final AssignmentSubmissionRepository submissionRepository;

    public AnnouncementAudienceServiceImpl(StudentRepository studentRepository,
                                            AttendanceRepository attendanceRepository,
                                            AssignmentSubmissionRepository submissionRepository) {
        this.studentRepository = studentRepository;
        this.attendanceRepository = attendanceRepository;
        this.submissionRepository = submissionRepository;
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
        if (announcement.getBatch() != null
                && (student.getBatch() == null || !student.getBatch().getId().equals(announcement.getBatch().getId()))) {
            return false;
        }
        if (announcement.getDepartment() != null
                && (student.getDepartment() == null || !student.getDepartment().getId().equals(announcement.getDepartment().getId()))) {
            return false;
        }
        if (announcement.getCollege() != null
                && (student.getCollege() == null || !student.getCollege().getId().equals(announcement.getCollege().getId()))) {
            return false;
        }
        if (announcement.getCourse() != null
                && (student.getCourse() == null || !student.getCourse().getId().equals(announcement.getCourse().getId()))) {
            return false;
        }
        return matchesRule(announcement, student);
    }

    private Specification<Student> buildStructuralSpec(Announcement a) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (a.getBatch() != null) {
                predicates.add(cb.equal(root.get("batch").get("id"), a.getBatch().getId()));
            }
            if (a.getDepartment() != null) {
                predicates.add(cb.equal(root.get("department").get("id"), a.getDepartment().getId()));
            }
            if (a.getCollege() != null) {
                predicates.add(cb.equal(root.get("college").get("id"), a.getCollege().getId()));
            }
            if (a.getCourse() != null) {
                predicates.add(cb.equal(root.get("course").get("id"), a.getCourse().getId()));
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
