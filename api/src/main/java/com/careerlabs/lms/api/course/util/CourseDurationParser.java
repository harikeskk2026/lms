package com.careerlabs.lms.api.course.util;

import java.time.LocalDate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses the course {@code duration} string (e.g. "3 months", "6 weeks", "90 days", "1 year")
 * and calculates the maximum allowed batch end date from a given batch start date.
 */
public final class CourseDurationParser {

    private static final Pattern DURATION_PATTERN = Pattern.compile(
            "^\\s*(\\d+)\\s+(days|weeks|months|years)\\s*$",
            Pattern.CASE_INSENSITIVE);

    private CourseDurationParser() {
    }

    /**
     * Calculates {@code startDate + duration}. Returns null if duration cannot be parsed.
     */
    public static LocalDate calculateMaxEndDate(LocalDate startDate, String duration) {
        if (startDate == null || duration == null || duration.isBlank()) {
            return null;
        }
        Matcher m = DURATION_PATTERN.matcher(duration.trim());
        if (!m.matches()) {
            return null;
        }
        int amount = Integer.parseInt(m.group(1));
        String unit = m.group(2).toLowerCase();
        return switch (unit) {
            case "days" -> startDate.plusDays(amount);
            case "weeks" -> startDate.plusWeeks(amount);
            case "months" -> startDate.plusMonths(amount);
            case "years" -> startDate.plusYears(amount);
            default -> null;
        };
    }

    public static boolean isValidDuration(String duration) {
        if (duration == null || duration.isBlank()) return false;
        return DURATION_PATTERN.matcher(duration.trim()).matches();
    }
}
