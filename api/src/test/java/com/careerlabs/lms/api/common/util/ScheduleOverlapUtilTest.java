package com.careerlabs.lms.api.common.util;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.course.entity.Course;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class ScheduleOverlapUtilTest {

    private Batch batch(LocalDate start, LocalDate end, String timing, Long id, String name) {
        Batch b = new Batch();
        if (id != null) ReflectionTestUtils.setField(b, "id", id);
        b.setName(name);
        Course c = new Course();
        ReflectionTestUtils.setField(c, "id", 1L);
        c.setTitle("Course " + name);
        b.setCourse(c);
        b.setStartDate(start);
        b.setEndDate(end);
        b.setTiming(timing);
        b.setActive(true);
        return b;
    }

    @Test
    @DisplayName("Same dates + same timing -> schedule overlap true")
    void sameDatesSameTiming_overlap() {
        Batch a = batch(LocalDate.of(2026,9,1), LocalDate.of(2026,9,30), "09:00 AM - 12:00 PM", 1L, "A");
        Batch b = batch(LocalDate.of(2026,9,1), LocalDate.of(2026,9,30), "09:00 AM - 12:00 PM", 2L, "B");
        assertTrue(ScheduleOverlapUtil.isScheduleOverlap(a, b));
    }

    @Test
    @DisplayName("Overlapping dates + overlapping timing -> overlap")
    void overlappingDatesOverlappingTiming() {
        Batch a = batch(LocalDate.of(2026,9,1), LocalDate.of(2026,9,30), "09:00 AM - 12:00 PM", 1L, "A");
        Batch b = batch(LocalDate.of(2026,9,15), LocalDate.of(2026,10,15), "10:00 AM - 01:00 PM", 2L, "B");
        assertTrue(ScheduleOverlapUtil.isScheduleOverlap(a, b));
    }

    @Test
    @DisplayName("Overlapping dates + different non-overlapping timing -> no overlap")
    void overlappingDatesDifferentTiming_noOverlap() {
        Batch a = batch(LocalDate.of(2026,9,1), LocalDate.of(2026,9,30), "09:00 AM - 12:00 PM", 1L, "A");
        Batch b = batch(LocalDate.of(2026,9,15), LocalDate.of(2026,10,15), "02:00 PM - 05:00 PM", 2L, "B");
        assertFalse(ScheduleOverlapUtil.isScheduleOverlap(a, b));
    }

    @Test
    @DisplayName("Same timing + non-overlapping dates -> no overlap")
    void sameTimingNonOverlappingDates_noOverlap() {
        Batch a = batch(LocalDate.of(2026,9,1), LocalDate.of(2026,9,30), "09:00 AM - 12:00 PM", 1L, "A");
        Batch b = batch(LocalDate.of(2026,10,1), LocalDate.of(2026,10,31), "09:00 AM - 12:00 PM", 2L, "B");
        assertFalse(ScheduleOverlapUtil.isScheduleOverlap(a, b));
    }

    @Test
    @DisplayName("Adjacent times 09-12 and 12-15 should NOT overlap")
    void adjacentTimes_noOverlap() {
        assertFalse(ScheduleOverlapUtil.isTimeOverlap("09:00 AM - 12:00 PM", "12:00 PM - 03:00 PM"));
    }

    @Test
    @DisplayName("Null dates considered overlap conservatively")
    void nullDates_overlap() {
        assertTrue(ScheduleOverlapUtil.isDateOverlap(null, null, LocalDate.of(2026,9,1), LocalDate.of(2026,9,30)));
    }

    @Test
    @DisplayName("Null/blank timings considered overlap conservatively")
    void nullTimings_overlap() {
        assertTrue(ScheduleOverlapUtil.isTimeOverlap(null, "09:00 AM - 12:00 PM"));
        assertTrue(ScheduleOverlapUtil.isTimeOverlap("", "09:00 AM - 12:00 PM"));
    }

    @Test
    @DisplayName("isDateOverlap inclusive on boundary: end equals start -> overlap")
    void dateBoundary_overlap() {
        assertTrue(ScheduleOverlapUtil.isDateOverlap(
                LocalDate.of(2026,9,1), LocalDate.of(2026,9,30),
                LocalDate.of(2026,9,30), LocalDate.of(2026,10,30)));
    }

    @Test
    @DisplayName("Non-overlapping dates Sep vs Oct non-overlap even with same timing")
    void nonOverlappingDates_false() {
        Batch a = batch(LocalDate.of(2026,9,1), LocalDate.of(2026,9,30), "09:00 AM - 12:00 PM", 1L, "A");
        Batch b = batch(LocalDate.of(2026,10,1), LocalDate.of(2026,10,31), "09:00 AM - 12:00 PM", 2L, "B");
        assertFalse(ScheduleOverlapUtil.isDateOverlap(a.getStartDate(), a.getEndDate(), b.getStartDate(), b.getEndDate()));
        assertFalse(ScheduleOverlapUtil.isScheduleOverlap(a, b));
    }

    @Test
    @DisplayName("Adjacent times 1:00-2:00 and 2:00-3:00 -> no overlap (PASS)")
    void adjacent1to2and2to3_noOverlap() {
        assertFalse(ScheduleOverlapUtil.isTimeOverlap("1:00-2:00", "2:00-3:00"));
        assertFalse(ScheduleOverlapUtil.isTimeOverlap("01:00-02:00", "02:00-03:00"));
    }

    @Test
    @DisplayName("Overlapping times 1:00-2:00 and 1:30-2:30 -> overlap (FAIL)")
    void overlapping1to2and130to230_overlap() {
        assertTrue(ScheduleOverlapUtil.isTimeOverlap("1:00-2:00", "1:30-2:30"));
    }

    @Test
    @DisplayName("Unicode en-dash adjacent times: 1:00 PM – 2:00 PM and 2:00 PM – 3:00 PM -> no overlap (PASS)")
    void unicodeEnDashAdjacent_noOverlap() {
        assertFalse(ScheduleOverlapUtil.isTimeOverlap("1:00 PM – 2:00 PM", "2:00 PM – 3:00 PM"));
    }

    @Test
    @DisplayName("Unicode en-dash overlapping times: 1:00 PM – 2:00 PM and 1:30 PM – 2:30 PM -> overlap (FAIL)")
    void unicodeEnDashOverlapping_overlap() {
        assertTrue(ScheduleOverlapUtil.isTimeOverlap("1:00 PM – 2:00 PM", "1:30 PM – 2:30 PM"));
    }
}
