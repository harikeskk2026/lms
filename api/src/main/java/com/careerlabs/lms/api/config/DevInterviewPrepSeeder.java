package com.careerlabs.lms.api.config;

import com.careerlabs.lms.api.quiz.entity.Question;
import com.careerlabs.lms.api.quiz.entity.QuestionOption;
import com.careerlabs.lms.api.quiz.entity.QuestionType;
import com.careerlabs.lms.api.quiz.entity.Quiz;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.entity.QuizQuestion;
import com.careerlabs.lms.api.quiz.entity.QuizStatus;
import com.careerlabs.lms.api.quiz.entity.QuizTopic;
import com.careerlabs.lms.api.quiz.entity.QuizType;
import com.careerlabs.lms.api.quiz.repository.QuestionRepository;
import com.careerlabs.lms.api.quiz.repository.QuizQuestionRepository;
import com.careerlabs.lms.api.quiz.repository.QuizRepository;
import com.careerlabs.lms.api.quiz.repository.QuizTopicRepository;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Seeds a published {@code INTERVIEW_PREP} quiz (behavioral + scenario + debugging +
 * code-output + SQL questions) so the admin Quiz Builder/Question Bank and the student
 * Interview Simulation flow ({@link com.careerlabs.lms.api.quiz.service.InterviewSimulationService})
 * have real data to demo instead of an empty "Interview Prep" filter. Controlled by the
 * same APP_SEED_ENABLED flag as the other dev seeders; runs once (skips if the quiz
 * already exists).
 */
@Component
@Order(4)
public class DevInterviewPrepSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevInterviewPrepSeeder.class);

    private static final String QUIZ_TITLE = "Backend Developer Interview Simulation";
    private static final String TOPIC_NAME = "Interview & Behavioral";

    private final QuizTopicRepository quizTopicRepository;
    private final QuestionRepository questionRepository;
    private final QuizRepository quizRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final UserRepository userRepository;
    private final boolean seedEnabled;

    public DevInterviewPrepSeeder(QuizTopicRepository quizTopicRepository, QuestionRepository questionRepository,
                                   QuizRepository quizRepository, QuizQuestionRepository quizQuestionRepository,
                                   UserRepository userRepository, @Value("${app.seed.enabled}") boolean seedEnabled) {
        this.quizTopicRepository = quizTopicRepository;
        this.questionRepository = questionRepository;
        this.quizRepository = quizRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.userRepository = userRepository;
        this.seedEnabled = seedEnabled;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled) {
            return;
        }
        boolean alreadySeeded = quizRepository.findAllByOrderByCreatedAtDesc().stream()
                .anyMatch(q -> QUIZ_TITLE.equals(q.getTitle()));
        if (alreadySeeded) {
            return;
        }

        Long createdBy = userRepository.findAll().stream().findFirst().map(u -> u.getId()).orElse(null);

        QuizTopic topic = quizTopicRepository.findAllByOrderByNameAsc().stream()
                .filter(t -> TOPIC_NAME.equals(t.getName()))
                .findFirst()
                .orElseGet(() -> topic(TOPIC_NAME, "Behavioral, scenario and technical interview readiness questions"));

        List<Question> questions = new ArrayList<>();

        questions.add(question(topic, QuestionType.INTERVIEW, QuizDifficulty.MEDIUM,
                "During a technical interview, how should you approach a question you don't immediately know the answer to?",
                "Interviewers care more about your problem-solving process than an instant correct answer.", 2, createdBy,
                option("Guess confidently and move on", false),
                option("Say you don't know and stay silent", false),
                option("Think aloud, break the problem down, and ask clarifying questions", true),
                option("Change the subject to a topic you know well", false)));

        questions.add(question(topic, QuestionType.SCENARIO, QuizDifficulty.HARD,
                "You're the lead developer on a project and discover a critical bug that will delay the release by " +
                        "2 days if fixed properly, but could be patched over in an hour. What should you do?",
                "Transparency with stakeholders about real risk beats a quiet quick-fix that can resurface in production.", 2, createdBy,
                option("Ship the quick patch and mention it to no one", false),
                option("Report the risk to your manager immediately and recommend the delay to fix it properly", true),
                option("Fix it silently after release", false),
                option("Ignore the bug since it wasn't caught in review", false)));

        questions.add(questionWithCode(topic, QuestionType.DEBUGGING, QuizDifficulty.MEDIUM,
                "What is wrong with the following loop, and how should it be fixed?",
                "The loop condition should be `i < arr.length`; using `<=` reads one index past the end of the array.", 2, createdBy,
                "for (int i = 0; i <= arr.length; i++) {\n    System.out.println(arr[i]);\n}",
                option("Nothing is wrong with this code", false),
                option("It throws ArrayIndexOutOfBoundsException — the condition should be i < arr.length", true),
                option("The println statement is invalid Java syntax", false),
                option("It should use a while loop instead of a for loop", false)));

        questions.add(questionWithCode(topic, QuestionType.CODE_OUTPUT, QuizDifficulty.HARD,
                "What does the following snippet print?",
                "x++ evaluates to 5 (x becomes 6), then ++x evaluates to 7 (x becomes 7); 5 + 7 = 12.", 2, createdBy,
                "int x = 5;\nint y = x++ + ++x;\nSystem.out.println(y);",
                option("10", false), option("11", false), option("12", true), option("13", false)));

        questions.add(question(topic, QuestionType.SQL, QuizDifficulty.MEDIUM,
                "Which SQL clause is used to filter grouped results in a GROUP BY query?",
                "HAVING filters after aggregation; WHERE filters rows before grouping happens.", 1, createdBy,
                option("WHERE", false), option("HAVING", true), option("ORDER BY", false), option("FILTER", false)));

        questions.add(question(topic, QuestionType.MCQ, QuizDifficulty.EASY,
                "What is the time complexity of binary search on a sorted array?",
                "Binary search halves the search space each step, giving O(log n).", 1, createdBy,
                option("O(n)", false), option("O(log n)", true), option("O(n^2)", false), option("O(1)", false)));

        questions.add(question(topic, QuestionType.INTERVIEW, QuizDifficulty.MEDIUM,
                "A teammate consistently submits code without tests, causing bugs in production. What's the best " +
                        "way to address this?",
                "Direct, private, empathetic feedback that offers to help resolves the root cause without damaging trust.", 2, createdBy,
                option("Publicly call them out in the next team meeting", false),
                option("Have a private conversation, explain the impact, and offer to pair on writing tests together", true),
                option("Quietly rewrite their code yourself", false),
                option("Escalate straight to HR", false)));

        questions.add(question(topic, QuestionType.SCENARIO, QuizDifficulty.HARD,
                "You need to design a rate limiter for a public API that must tolerate short traffic bursts while " +
                        "still enforcing a steady average request rate. Which approach fits best?",
                "The token bucket algorithm allows short bursts up to the bucket size while enforcing a steady refill rate.", 2, createdBy,
                option("Fixed window counter", false), option("Token bucket algorithm", true),
                option("No limiting — rely on server capacity", false), option("Randomly drop requests", false)));

        questions = questionRepository.saveAll(questions);

        Quiz quiz = new Quiz();
        quiz.setTitle(QUIZ_TITLE);
        quiz.setDescription("A mixed behavioral, scenario, debugging and technical simulation to gauge interview readiness.");
        quiz.setType(QuizType.INTERVIEW_PREP);
        quiz.setDifficulty(QuizDifficulty.HARD);
        quiz.setDuration(30);
        quiz.setPassingScore(60);
        quiz.setMaxAttempts(2);
        quiz.setRandomQuestions(false);
        quiz.setRandomOptions(false);
        quiz.setShowExplanation(true);
        quiz.setStatus(QuizStatus.PUBLISHED);
        quiz.setCreatedBy(createdBy);
        quiz = quizRepository.save(quiz);

        int order = 0;
        for (Question question : questions) {
            QuizQuestion quizQuestion = new QuizQuestion();
            quizQuestion.setQuiz(quiz);
            quizQuestion.setQuestion(question);
            quizQuestion.setOrderIndex(order++);
            quizQuestionRepository.save(quizQuestion);
        }

        log.info("Seeded interview prep quiz '{}' with {} questions", QUIZ_TITLE, questions.size());
    }

    private QuizTopic topic(String name, String description) {
        QuizTopic topic = new QuizTopic();
        topic.setName(name);
        topic.setDescription(description);
        return quizTopicRepository.save(topic);
    }

    @SafeVarargs
    private final Question question(QuizTopic topic, QuestionType type, QuizDifficulty difficulty, String text,
                                     String explanation, int points, Long createdBy,
                                     Map.Entry<String, Boolean>... opts) {
        return questionWithCode(topic, type, difficulty, text, explanation, points, createdBy, null, opts);
    }

    @SafeVarargs
    private final Question questionWithCode(QuizTopic topic, QuestionType type, QuizDifficulty difficulty, String text,
                                              String explanation, int points, Long createdBy, String codeSnippet,
                                              Map.Entry<String, Boolean>... opts) {
        Question question = new Question();
        question.setTopic(topic);
        question.setQuestionType(type);
        question.setDifficulty(difficulty);
        question.setQuestionText(text);
        question.setExplanation(explanation);
        question.setCodeSnippet(codeSnippet);
        question.setPoints(points);
        question.setActive(true);
        question.setCreatedBy(createdBy);

        int index = 0;
        for (Map.Entry<String, Boolean> opt : opts) {
            QuestionOption option = new QuestionOption();
            option.setQuestion(question);
            option.setOptionText(opt.getKey());
            option.setCorrect(opt.getValue());
            option.setOrderIndex(index++);
            question.getOptions().add(option);
        }
        return question;
    }

    private Map.Entry<String, Boolean> option(String text, boolean correct) {
        return Map.entry(text, correct);
    }
}
