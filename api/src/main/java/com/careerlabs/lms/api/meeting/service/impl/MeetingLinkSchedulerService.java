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

import java.time.LocalDateTime;
import java.util.List;

/**
 * Auto-manages scheduled class statuses based on their scheduled start and end times:
 * 1. Automatically transitions SCHEDULED -> LIVE when scheduledStart arrives.
 * 2. Automatically transitions SCHEDULED/LIVE -> COMPLETED when scheduledEnd passes.
 */
@Component
public class MeetingLinkSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(MeetingLinkSchedulerService.class);
    private static final List<MeetingStatus> AUTO_COMPLETABLE = List.of(MeetingStatus.SCHEDULED, MeetingStatus.LIVE);

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
        // 1. Auto-complete classes whose end time has passed
        List<MeetingLink> ended = meetingLinkRepository.findDueForAutoComplete(AUTO_COMPLETABLE, now);
        for (MeetingLink meeting : ended) {
            meeting.setStatus(MeetingStatus.COMPLETED);
            if (meeting.getDailyClass() != null) {
                meeting.getDailyClass().setStatus(ClassStatus.COMPLETED);
                dailyClassRepository.save(meeting.getDailyClass());
            }
            meetingLinkRepository.save(meeting);
            log.info("Auto-completed scheduled class {} (\"{}\") — scheduled end time passed", meeting.getId(), meeting.getTitle());
        }

        // 2. Auto-start classes whose start time has arrived (and end time hasn't passed)
        List<MeetingLink> starting = meetingLinkRepository.findDueForAutoStart(now);
        for (MeetingLink meeting : starting) {
            meeting.setStatus(MeetingStatus.LIVE);
            meetingLinkRepository.save(meeting);
            log.info("Auto-started scheduled class {} (\"{}\") — scheduled start time arrived (status set to LIVE)", meeting.getId(), meeting.getTitle());
        }
    }
}
