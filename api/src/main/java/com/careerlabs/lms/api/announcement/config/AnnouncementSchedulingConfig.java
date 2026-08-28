package com.careerlabs.lms.api.announcement.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Enables the @Scheduled auto-publish/auto-expire sweep in AnnouncementSchedulerService. */
@Configuration
@EnableScheduling
public class AnnouncementSchedulingConfig {
}
