package com.careerlabs.lms.api.course.service.impl;

import com.careerlabs.lms.api.course.repository.CourseRepository;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
class CourseCodeGenerator {

    private final CourseRepository courseRepository;

    CourseCodeGenerator(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    /**
     * Generates a short unique course code from the title.
     * e.g. "Full Stack Python" -> "FSP", "Java Development" -> "JD"
     * Appends a numeric suffix on collision: "FSP-2", "FSP-3", etc.
     */
    String generateUnique(String title) {
        String base = generateCode(title);
        String candidate = base;
        int suffix = 2;
        while (courseRepository.existsByCourseCode(candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private String generateCode(String title) {
        if (title == null || title.isBlank()) return "CS";
        String[] words = title.trim().split("\\s+");
        StringBuilder code = new StringBuilder();
        for (String word : words) {
            String clean = word.replaceAll("[^a-zA-Z]", "");
            if (!clean.isEmpty()) {
                code.append(Character.toUpperCase(clean.charAt(0)));
            }
        }
        String result = code.toString();
        if (result.isEmpty()) return "CS";
        return result.length() > 6 ? result.substring(0, 6) : result;
    }
}
