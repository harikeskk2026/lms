package com.careerlabs.lms.api.config;

import com.careerlabs.lms.api.quiz.entity.AptitudeTip;
import com.careerlabs.lms.api.quiz.repository.AptitudeTipRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Seeds the aptitude revision tips shown on the student Interview Prep tab. Gated by
 * {@code app.seed.enabled} like {@link InterviewQuestionSeeder}, and idempotent: only
 * inserts when the table is empty so it never clobbers admin-managed content.
 */
@Component
@Order(1)
public class AptitudeTipSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AptitudeTipSeeder.class);

    @Value("${app.seed.enabled:false}")
    private boolean seedEnabled;

    private final AptitudeTipRepository repository;

    public AptitudeTipSeeder(AptitudeTipRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled || repository.count() > 0) {
            return;
        }

        List<AptitudeTip> tips = List.of(
                tip("Time & Work",
                        "Combined Rate = 1/A + 1/B; Time = 1/Rate",
                        "A does work in 10 days, B in 15 days. Together: 1/10 + 1/15 = 1/6. Time = 6 days"),
                tip("Percentages",
                        "x% of y = (x × y) / 100; % change = (Diff/Original) × 100",
                        "40% of 300 = (40 × 300)/100 = 120. Profit: Buy at 100, sell at 120 → 20% profit"),
                tip("Ratio & Proportion",
                        "a:b = c:d → ad = bc (Cross multiply)",
                        "Boys:Girls = 3:2, total 30. Girls = (2/5) × 30 = 12"),
                tip("Number Series",
                        "Check differences, ratios, alternating patterns, and squares/cubes",
                        "Fibonacci: 1,1,2,3,5,8,13... | Squares: 1,4,9,16,25..."),
                tip("Averages",
                        "Avg = Sum/Count; New avg = (Old sum ± change) / new count",
                        "5 numbers avg 20 (sum=100). Remove one with value 28. New avg = 72/4 = 18"),
                tip("Speed, Distance, Time",
                        "Distance = Speed × Time; Relative speed: same dir = |S1-S2|, opposite = S1+S2",
                        "Train 100m at 54 km/h crosses pole: t = 100/(54×5/18) = 100/15 ≈ 6.67s"));

        repository.saveAll(tips);
        log.info("Seeded {} aptitude tips", tips.size());
    }

    private AptitudeTip tip(String topic, String formula, String example) {
        AptitudeTip entry = new AptitudeTip();
        entry.setTopic(topic);
        entry.setFormula(formula);
        entry.setExample(example);
        entry.setActive(true);
        return entry;
    }
}