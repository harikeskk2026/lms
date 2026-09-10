package com.careerlabs.lms.api.meeting.service.impl;

import com.careerlabs.lms.api.attendance.entity.ClassStatus;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.meeting.entity.MeetingLink;
import com.careerlabs.lms.api.meeting.entity.MeetingStatus;
import com.careerlabs.lms.api.meeting.repository.MeetingLinkRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Auto-manages scheduled class statuses based on their scheduled start and end times:
 * 1. Transitions to SCHEDULED before the class start date or before daily start time.
 * 2. Transitions to LIVE during the daily scheduled time window.
 * 3. Transitions to COMPLETED after the daily end time or after the end date.
 */
@Component
public class MeetingLinkSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(MeetingLinkSchedulerService.class);

    private final MeetingLinkRepository meetingLinkRepository;
    private final DailyClassRepository dailyClassRepository;

    public MeetingLinkSchedulerService(MeetingLinkRepository meetingLinkRepository, DailyClassRepository dailyClassRepository) {
        this.meetingLinkRepository = meetingLinkRepository;
        this.dailyClassRepository = dailyClassRepository;
    }

    /** Run every 10 seconds to auto-transition classes in real-time. */
    @Scheduled(fixedDelay = 10_000)
    @Transactional
    public void runPeriodicStatusTransitions() {
        autoTransitionStatuses(LocalDateTime.now());
    }

    @Transactional
    public void autoTransitionStatuses(LocalDateTime now) {
        List<MeetingLink> meetings = meetingLinkRepository.findAll();
        LocalDate today = now.toLocalDate();
        LocalTime currentTime = now.toLocalTime();

        for (MeetingLink meeting : meetings) {
            if (meeting.getStatus() == MeetingStatus.CANCELLED || meeting.getScheduledStart() == null) {
                continue;
            }

            LocalDate startDate = meeting.getScheduledStart().toLocalDate();
            LocalTime startTime = meeting.getScheduledStart().toLocalTime();

            LocalDate endDate = meeting.getScheduledEnd() != null ? meeting.getScheduledEnd().toLocalDate() : startDate;
            LocalTime endTime = meeting.getScheduledEnd() != null ? meeting.getScheduledEnd().toLocalTime() : startTime.plusHours(1);

            MeetingStatus targetStatus;
            if (today.isBefore(startDate)) {
                targetStatus = MeetingStatus.SCHEDULED;
            } else if (today.isAfter(endDate)) {
                targetStatus = MeetingStatus.COMPLETED;
            } else {
                // Today is within [startDate, endDate]
                if (currentTime.isBefore(startTime)) {
                    targetStatus = MeetingStatus.SCHEDULED;
                } else if (!currentTime.isAfter(endTime)) {
                    targetStatus = MeetingStatus.LIVE;
                } else {
                    targetStatus = MeetingStatus.COMPLETED;
                }
            }

            if (meeting.getStatus() != targetStatus) {
                log.info("Transitioning scheduled class {} (\"{}\") from {} to {} (now: {})",
                        meeting.getId(), meeting.getTitle(), meeting.getStatus(), targetStatus, now);
                meeting.setStatus(targetStatus);
                if (meeting.getDailyClass() != null) {
                    if (targetStatus == MeetingStatus.COMPLETED) {
                        meeting.getDailyClass().setStatus(ClassStatus.COMPLETED);
                    } else if (targetStatus == MeetingStatus.SCHEDULED) {
                        meeting.getDailyClass().setStatus(ClassStatus.SCHEDULED);
                    }
                    dailyClassRepository.save(meeting.getDailyClass());
                }
                meetingLinkRepository.save(meeting);
            }
        }
    }
}
