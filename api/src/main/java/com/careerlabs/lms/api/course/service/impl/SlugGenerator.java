package com.careerlabs.lms.api.course.service.impl;

import com.careerlabs.lms.api.course.repository.CourseRepository;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.regex.Pattern;

@Component
class SlugGenerator {

    private static final Pattern NON_ALPHANUMERIC = Pattern.compile("[^a-z0-9]+");

    private final CourseRepository courseRepository;

    SlugGenerator(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    /**
     * Derives a URL-friendly, unique slug from a title, e.g. "Full Stack Python" -> "full-stack-python",
     * appending "-2", "-3", ... on collision.
     */
    String generateUnique(String title) {
        String base = NON_ALPHANUMERIC.matcher(title.toLowerCase(Locale.ROOT)).replaceAll("-");
        base = base.replaceAll("^-+|-+$", "");
        if (base.isBlank()) {
            base = "course";
        }

        String candidate = base;
        int suffix = 2;
        while (courseRepository.existsBySlug(candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }
}
