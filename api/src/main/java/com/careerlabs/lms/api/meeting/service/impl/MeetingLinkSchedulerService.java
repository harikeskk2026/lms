package com.careerlabs.lms.api.meeting.service.impl;

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
 * Auto-completes scheduled classes once their scheduled end time passes, so admins don't
 * have to remember to click "Mark Completed" (@Scheduled infra already enabled by
 * {@link com.careerlabs.lms.api.announcement.config.AnnouncementSchedulingConfig}).
 * Only affects meetings that have an end time set; those without one still require a
 * manual status change.
 */
@Component
public class MeetingLinkSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(MeetingLinkSchedulerService.class);
    private static final List<MeetingStatus> AUTO_COMPLETABLE = List.of(MeetingStatus.SCHEDULED, MeetingStatus.LIVE);

    private final MeetingLinkRepository meetingLinkRepository;

    public MeetingLinkSchedulerService(MeetingLinkRepository meetingLinkRepository) {
        this.meetingLinkRepository = meetingLinkRepository;
    }

    /** Every minute: mark SCHEDULED/LIVE meetings COMPLETED once their end time has passed. */
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void autoCompleteEndedMeetings() {
        List<MeetingLink> due = meetingLinkRepository.findDueForAutoComplete(AUTO_COMPLETABLE, LocalDateTime.now());
        for (MeetingLink meeting : due) {
            meeting.setStatus(MeetingStatus.COMPLETED);
            meetingLinkRepository.save(meeting);
            log.info("Auto-completed scheduled class {} (\"{}\") — scheduled end time passed", meeting.getId(), meeting.getTitle());
        }
    }
}
