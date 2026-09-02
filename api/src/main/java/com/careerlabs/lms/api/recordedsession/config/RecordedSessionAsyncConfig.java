package com.careerlabs.lms.api.recordedsession.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/** Enables @Async so video transcoding runs off the upload request thread. */
@Configuration
@EnableAsync
public class RecordedSessionAsyncConfig {
}
