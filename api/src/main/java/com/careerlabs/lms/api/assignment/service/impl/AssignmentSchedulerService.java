package com.careerlabs.lms.api.assignment.service.impl;

import com.careerlabs.lms.api.assignment.entity.Assignment;
import com.careerlabs.lms.api.assignment.entity.AssignmentStatus;
import com.careerlabs.lms.api.assignment.repository.AssignmentRepository;
import com.careerlabs.lms.api.assignment.service.AssignmentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Component
public class AssignmentSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(AssignmentSchedulerService.class);

    private final AssignmentRepository assignmentRepository;
    private final AssignmentService assignmentService;

    public AssignmentSchedulerService(AssignmentRepository assignmentRepository,
                                       AssignmentService assignmentService) {
        this.assignmentRepository = assignmentRepository;
        this.assignmentService = assignmentService;
    }

    /** Every minute: auto-publish DRAFT assignments whose publish date & time has arrived, and auto-close PUBLISHED assignments whose close date & time has passed. */
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void processScheduledAssignmentTransitions() {
        LocalDateTime now = LocalDateTime.now();

        // 1. Auto-publish DRAFT assignments whose scheduled start/publish date & time has arrived
        List<Assignment> draftAssignments = assignmentRepository.findAll().stream()
                .filter(a -> a.getStatus() == AssignmentStatus.DRAFT && a.getStartDate() != null)
                .filter(a -> {
                    LocalDateTime publishDateTime = a.getPublishTime() != null
                            ? LocalDateTime.of(a.getStartDate(), a.getPublishTime())
                            : a.getStartDate().atStartOfDay();
                    return !now.isBefore(publishDateTime);
                })
                .toList();

        for (Assignment a : draftAssignments) {
            try {
                assignmentService.publish(a.getId());
                log.info("Auto-published assignment ID {}", a.getId());
            } catch (Exception e) {
                log.warn("Failed to auto-publish assignment ID {}: {}", a.getId(), e.getMessage());
            }
        }

        // 2. Auto-close PUBLISHED assignments whose due/close date & time has passed
        List<Assignment> dueAssignments = assignmentRepository.findAll().stream()
                .filter(a -> a.getStatus() == AssignmentStatus.PUBLISHED && a.getDueDate() != null)
                .filter(a -> {
                    LocalDateTime closeDateTime = a.getCloseTime() != null
                            ? LocalDateTime.of(a.getDueDate(), a.getCloseTime())
                            : a.getDueDate().atTime(23, 59, 59);
                    return now.isAfter(closeDateTime);
                })
                .toList();

        for (Assignment a : dueAssignments) {
            try {
                assignmentService.close(a.getId());
                log.info("Auto-closed assignment ID {}", a.getId());
            } catch (Exception e) {
                log.warn("Failed to auto-close assignment ID {}: {}", a.getId(), e.getMessage());
            }
        }
    }
}
