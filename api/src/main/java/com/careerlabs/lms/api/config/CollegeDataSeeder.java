package com.careerlabs.lms.api.config;

import com.careerlabs.lms.api.college.entity.College;
import com.careerlabs.lms.api.college.repository.CollegeRepository;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Seeds a couple of colleges (linked to whatever CareerLabs courses already
 * exist, purely so the "Course" dropdown has data), so the College dropdown
 * on the Student form has real data to exercise locally. Controlled by the
 * same APP_SEED_ENABLED flag as {@link DevUserSeeder}; only runs once, when
 * the colleges table is empty and at least one course already exists.
 */
@Component
public class CollegeDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(CollegeDataSeeder.class);
    private static final List<String> COLLEGE_NAMES = List.of(
            "CareerLabs Institute of Technology",
            "National College of Engineering",
            "Metro City University"
    );
    private final CollegeRepository collegeRepository;
    private final CourseRepository courseRepository;
    private final boolean seedEnabled;

    public CollegeDataSeeder(CollegeRepository collegeRepository,
                              CourseRepository courseRepository,
                              @Value("${app.seed.enabled}") boolean seedEnabled) {
        this.collegeRepository = collegeRepository;
        this.courseRepository = courseRepository;
        this.seedEnabled = seedEnabled;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled || collegeRepository.count() > 0) {
            return;
        }

        List<Course> courses = courseRepository.findAllByOrderByCreatedAtDesc();
        if (courses.isEmpty()) {
            log.info("Skipping college seed: no courses exist yet");
            return;
        }

        Set<Course> offeredCourses = new LinkedHashSet<>(courses);
        List<College> colleges = new java.util.ArrayList<>();
        for (String name : COLLEGE_NAMES) {
            College college = new College();
            college.setName(name);
            college.setCourses(offeredCourses);
            colleges.add(collegeRepository.save(college));
        }

        log.info("Seeded {} colleges for local development", colleges.size());
    }
}
