package com.careerlabs.lms.api.announcement.service.impl;

import com.careerlabs.lms.api.announcement.entity.Announcement;
import com.careerlabs.lms.api.announcement.entity.AnnouncementStatus;
import com.careerlabs.lms.api.announcement.repository.AnnouncementRepository;
import com.careerlabs.lms.api.announcement.service.AnnouncementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnnouncementSchedulerServiceTest {

    @Mock
    private AnnouncementRepository announcementRepository;
    @Mock
    private AnnouncementService announcementService;

    @InjectMocks
    private AnnouncementSchedulerService scheduler;

    private Announcement scheduled(Long id) {
        Announcement a = new Announcement();
        ReflectionTestUtils.setField(a, "id", id);
        a.setStatus(AnnouncementStatus.SCHEDULED);
        a.setTitle("title" + id);
        a.setBody("body" + id);
        return a;
    }

    @Test
    @DisplayName("The scheduler auto-publishes every SCHEDULED announcement whose time has arrived")
    void publishesDueAnnouncements() {
        Announcement due1 = scheduled(1L);
        Announcement due2 = scheduled(2L);
        when(announcementRepository.findByStatusAndScheduledAtLessThanEqual(
                eq(AnnouncementStatus.SCHEDULED), any(Instant.class)))
                .thenReturn(List.of(due1, due2));

        scheduler.publishDueScheduled();

        verify(announcementService).publish(1L);
        verify(announcementService).publish(2L);
    }

    @Test
    @DisplayName("The scheduler does nothing when no scheduled announcements are due")
    void skipsWhenNothingDue() {
        when(announcementRepository.findByStatusAndScheduledAtLessThanEqual(
                eq(AnnouncementStatus.SCHEDULED), any(Instant.class)))
                .thenReturn(List.of());

        scheduler.publishDueScheduled();

        verify(announcementService, never()).publish(anyLong());
    }

    @Test
    @DisplayName("A failing publish is contained and does not block other due announcements")
    void containsPublishFailure() {
        Announcement due1 = scheduled(1L);
        Announcement due2 = scheduled(2L);
        when(announcementRepository.findByStatusAndScheduledAtLessThanEqual(
                eq(AnnouncementStatus.SCHEDULED), any(Instant.class)))
                .thenReturn(List.of(due1, due2));
        doThrow(new RuntimeException("boom")).when(announcementService).publish(1L);

        assertDoesNotThrow(() -> scheduler.publishDueScheduled());

        verify(announcementService).publish(2L);
    }

    @Test
    @DisplayName("Auto-publish goes through the same publish path that fires the audience notification")
    void autoPublishDelegatesToPublishPath() {
        Announcement due = scheduled(9L);
        when(announcementRepository.findByStatusAndScheduledAtLessThanEqual(
                eq(AnnouncementStatus.SCHEDULED), any(Instant.class)))
                .thenReturn(List.of(due));

        scheduler.publishDueScheduled();

        verify(announcementService).publish(9L);
    }
}