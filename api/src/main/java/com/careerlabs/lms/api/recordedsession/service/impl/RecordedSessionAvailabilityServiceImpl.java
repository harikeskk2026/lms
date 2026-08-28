package com.careerlabs.lms.api.recordedsession.service.impl;

import com.careerlabs.lms.api.recordedsession.entity.RecordedSession;
import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionEffectiveStatus;
import com.careerlabs.lms.api.recordedsession.service.RecordedSessionAvailabilityService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class RecordedSessionAvailabilityServiceImpl implements RecordedSessionAvailabilityService {

    @Override
    public RecordedSessionEffectiveStatus effectiveStatus(RecordedSession session) {
        return switch (session.getStatus()) {
            case DRAFT -> RecordedSessionEffectiveStatus.DRAFT;
            case PROCESSING -> RecordedSessionEffectiveStatus.PROCESSING;
            case READY -> RecordedSessionEffectiveStatus.READY;
            case ARCHIVED -> RecordedSessionEffectiveStatus.ARCHIVED;
            case FAILED -> RecordedSessionEffectiveStatus.FAILED;
            case PUBLISHED -> {
                LocalDateTime now = LocalDateTime.now();
                if (session.getAvailableFrom() != null && now.isBefore(session.getAvailableFrom())) {
                    yield RecordedSessionEffectiveStatus.SCHEDULED;
                }
                if (session.getAvailableUntil() != null && now.isAfter(session.getAvailableUntil())) {
                    yield RecordedSessionEffectiveStatus.EXPIRED;
                }
                yield RecordedSessionEffectiveStatus.LIVE;
            }
        };
    }
}
