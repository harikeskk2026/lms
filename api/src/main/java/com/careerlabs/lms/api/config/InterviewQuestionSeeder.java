package com.careerlabs.lms.api.config;

import com.careerlabs.lms.api.quiz.entity.InterviewQuestion;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.repository.InterviewQuestionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Seeds the HR round Q&A entries used by the student Interview Prep tab. Gated by
 * {@code app.seed.enabled} like {@link AdminAccountSeeder}, and idempotent: only
 * inserts when the "HR" category is empty so it never clobbers admin-managed content.
 */
@Component
@Order(1)
public class InterviewQuestionSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(InterviewQuestionSeeder.class);

    @Value("${app.seed.enabled:false}")
    private boolean seedEnabled;

    private final InterviewQuestionRepository repository;

    public InterviewQuestionSeeder(InterviewQuestionRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled) {
            return;
        }
        if (repository.countByCategoryAndActiveTrue("HR") > 0) {
            return;
        }

        List<InterviewQuestion> hr = List.of(
                hr("Tell me about yourself.",
                        "Introduction", QuizDifficulty.EASY,
                        "Use the 3-part framework:\n\n1. Present: \"I am [name], a [role/background]...\"\n2. Past: \"I have [X years/months] of experience in [skills]...\"\n3. Future: \"I am looking to [goal] at a company like yours.\"\n\nKeep it under 2 minutes. Start with your professional identity, not personal details.",
                        "practice-out-loud"),
                hr("Why do you want to work at our company?",
                        "Company-specific", QuizDifficulty.MEDIUM,
                        "Research the company first. Mention:\n\n1. Specific products/services you admire\n2. Company values that align with yours\n3. Growth opportunities in the role\n\n\"I admire how [Company] is solving [problem]. Your engineering culture of [X] resonates with me, and I believe I can contribute to [specific team/goal].\"",
                        "company-research"),
                hr("What are your strengths and weaknesses?",
                        "Behavioural", QuizDifficulty.MEDIUM,
                        "Strength: Pick one that's genuinely relevant to the role. Give a specific example.\n\nWeakness: Pick a real weakness you're actively improving. Frame it constructively:\n\"I used to struggle with [X], but I've been working on it by [action], and I've seen improvement in [result].\"",
                        "self-awareness"),
                hr("Where do you see yourself in 5 years?",
                        "Behavioural", QuizDifficulty.MEDIUM,
                        "Show ambition but align with the company:\n\n\"In 5 years, I see myself as a [senior role] with expertise in [domain]. I want to grow with a company where I can take on increasing responsibility. This role at [Company] feels like the perfect starting point.\"",
                        "career-growth"),
                hr("Describe a challenging situation and how you handled it.",
                        "Situational", QuizDifficulty.HARD,
                        "Use the STAR method:\n\nSituation: \"In my [project/internship]...\"\nTask: \"I was responsible for...\"\nAction: \"I decided to... because...\"\nResult: \"As a result, we achieved...\"\n\nPick a story where YOU took initiative. Quantify results if possible.",
                        "star-method"),
                hr("Why should we hire you?",
                        "Introduction", QuizDifficulty.HARD,
                        "This is your elevator pitch. Structure:\n\n1. Your top 2-3 relevant skills/achievements\n2. How you solve their specific problem\n3. Your unique differentiator\n\n\"You should hire me because I bring [skill 1], [skill 2], and a proven track record of [achievement]. I'm confident I can [specific contribution] for your team.\"",
                        "elevator-pitch"));

        repository.saveAll(hr);
        log.info("Seeded {} HR interview questions", hr.size());
    }

    private InterviewQuestion hr(String question, String category, QuizDifficulty difficulty,
                                 String answer, String tags) {
        InterviewQuestion entry = new InterviewQuestion();
        entry.setCategory("HR");
        entry.setQuestionText(question);
        entry.setAnswerText(answer);
        entry.setDifficulty(difficulty);
        entry.setTags("HR," + category + "," + tags);
        entry.setActive(true);
        return entry;
    }
}