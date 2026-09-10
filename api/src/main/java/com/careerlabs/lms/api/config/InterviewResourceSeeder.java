package com.careerlabs.lms.api.config;

import com.careerlabs.lms.api.quiz.entity.InterviewResource;
import com.careerlabs.lms.api.quiz.repository.InterviewResourceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Seeds the interview-prep resource links shown on the student Interview Prep tab.
 * Gated by {@code app.seed.enabled} like {@link InterviewQuestionSeeder}, and
 * idempotent: only inserts when the table is empty so it never clobbers admin-managed content.
 */
@Component
@Order(1)
public class InterviewResourceSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(InterviewResourceSeeder.class);

    @Value("${app.seed.enabled:false}")
    private boolean seedEnabled;

    private final InterviewResourceRepository repository;

    public InterviewResourceSeeder(InterviewResourceRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled || repository.count() > 0) {
            return;
        }

        List<InterviewResource> resources = List.of(
                resource("Cracking the Coding Interview",
                        "189 programming questions & solutions by Gayle Laakmann McDowell. The gold standard for technical interview prep.",
                        "https://www.crackingthecodinginterview.com/", "Book"),
                resource("NeetCode DSA Roadmap",
                        "Structured DSA practice with 150+ curated LeetCode problems organized by topic. Best for systematic prep.",
                        "https://neetcode.io/roadmap", "Free Resource"),
                resource("Python Interview Prep",
                        "Curated Python interview questions and explanations from the official docs and Real Python tutorials.",
                        "https://realpython.com/tutorials/interview/", "Guide"),
                resource("System Design Primer",
                        "Learn how to design large-scale systems. Essential for senior-level interviews at product companies.",
                        "https://github.com/donnemartin/system-design-primer", "GitHub"),
                resource("STAR Method Guide",
                        "Master the STAR method, a go-to framework for answering behavioural and HR interview questions.",
                        "https://www.themuse.com/advice/star-interview-method", "Guide"));

        repository.saveAll(resources);
        log.info("Seeded {} interview resources", resources.size());
    }

    private InterviewResource resource(String title, String description, String url, String tag) {
        InterviewResource entry = new InterviewResource();
        entry.setTitle(title);
        entry.setDescription(description);
        entry.setUrl(url);
        entry.setTag(tag);
        entry.setActive(true);
        return entry;
    }
}