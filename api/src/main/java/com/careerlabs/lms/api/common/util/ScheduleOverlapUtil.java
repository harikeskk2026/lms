package com.careerlabs.lms.api.common.util;

import com.careerlabs.lms.api.batch.entity.Batch;

import java.time.LocalDate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class ScheduleOverlapUtil {

    private ScheduleOverlapUtil() {
    }

    private static final Pattern TIME_12H_PATTERN =
            Pattern.compile("(?i)^(\\d{1,2})(?::(\\d{2}))?\\s*(AM|PM)$");
    private static final Pattern TIME_24H_PATTERN =
            Pattern.compile("^(\\d{1,2})(?::(\\d{2}))?$");

    public static boolean isDateOverlap(LocalDate start1, LocalDate end1, LocalDate start2, LocalDate end2) {
        if (start1 == null || end1 == null || start2 == null || end2 == null) {
            return true;
        }
        return !start1.isAfter(end2) && !end1.isBefore(start2);
    }

    public static boolean isTimeOverlap(String timing1, String timing2) {
        if (timing1 == null || timing1.isBlank() || timing2 == null || timing2.isBlank()) {
            return true;
        }
        if (timing1.trim().equalsIgnoreCase(timing2.trim())) {
            return true;
        }
        TimeRange range1 = parseTiming(timing1);
        TimeRange range2 = parseTiming(timing2);
        if (range1 == null || range2 == null) {
            return timing1.trim().equalsIgnoreCase(timing2.trim());
        }
        return range1.overlapsWith(range2);
    }

    public static boolean isScheduleOverlap(Batch a, Batch b) {
        if (a == null || b == null) {
            return false;
        }
        return isDateOverlap(a.getStartDate(), a.getEndDate(), b.getStartDate(), b.getEndDate())
                && isTimeOverlap(a.getTiming(), b.getTiming());
    }

    public static boolean isScheduleOverlap(LocalDate start1, LocalDate end1, String timing1,
                                             LocalDate start2, LocalDate end2, String timing2) {
        return isDateOverlap(start1, end1, start2, end2) && isTimeOverlap(timing1, timing2);
    }

    private static Integer parseTimeToMinutes(String timeStr) {
        if (timeStr == null) return null;
        String s = timeStr.trim();
        Matcher m12 = TIME_12H_PATTERN.matcher(s);
        if (m12.matches()) {
            int hour = Integer.parseInt(m12.group(1));
            int minute = m12.group(2) != null ? Integer.parseInt(m12.group(2)) : 0;
            String ampm = m12.group(3).toUpperCase();
            if (hour == 12) {
                hour = ampm.equals("AM") ? 0 : 12;
            } else if (ampm.equals("PM")) {
                hour += 12;
            }
            return hour * 60 + minute;
        }
        Matcher m24 = TIME_24H_PATTERN.matcher(s);
        if (m24.matches()) {
            int hour = Integer.parseInt(m24.group(1));
            int minute = m24.group(2) != null ? Integer.parseInt(m24.group(2)) : 0;
            return hour * 60 + minute;
        }
        return null;
    }

    private static TimeRange parseTiming(String timing) {
        if (timing == null || timing.isBlank()) return null;
        String normalized = timing.replaceAll("[\\u2013\\u2014]", "-");
        String[] parts = normalized.split("-");
        if (parts.length != 2) return null;
        Integer start = parseTimeToMinutes(parts[0]);
        Integer end = parseTimeToMinutes(parts[1]);
        if (start == null || end == null || start >= end) return null;
        return new TimeRange(start, end);
    }

    private record TimeRange(int startMinutes, int endMinutes) {
        boolean overlapsWith(TimeRange other) {
            return this.startMinutes < other.endMinutes && this.endMinutes > other.startMinutes;
        }
    }
}
