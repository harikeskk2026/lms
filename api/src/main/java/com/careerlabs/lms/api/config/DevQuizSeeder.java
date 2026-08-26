package com.careerlabs.lms.api.config;

import com.careerlabs.lms.api.quiz.entity.Question;
import com.careerlabs.lms.api.quiz.entity.QuestionOption;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.entity.QuestionType;
import com.careerlabs.lms.api.quiz.entity.Quiz;
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
 * Seeds a small ready-to-test quiz (topics, a bank question of every type, and one
 * published quiz with them attached) so the Quiz module can be exercised end-to-end
 * without hand-building data first. Controlled by the same APP_SEED_ENABLED flag as
 * {@link DevUserSeeder}; only runs while the quiz tables are empty.
 */
@Component
@Order(2)
public class DevQuizSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevQuizSeeder.class);

    private final QuizTopicRepository quizTopicRepository;
    private final QuestionRepository questionRepository;
    private final QuizRepository quizRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final UserRepository userRepository;
    private final boolean seedEnabled;

    public DevQuizSeeder(QuizTopicRepository quizTopicRepository, QuestionRepository questionRepository,
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
        if (!seedEnabled || quizRepository.count() > 0) {
            return;
        }

        Long createdBy = userRepository.findAll().stream().findFirst().map(u -> u.getId()).orElse(null);

        QuizTopic javaCore = topic("Java Core", "Language fundamentals, OOP, syntax");
        QuizTopic collections = topic("Collections", "Java Collections Framework");
        QuizTopic springBoot = topic("Spring Boot", "Spring Boot annotations and REST");

        List<Question> questions = new ArrayList<>();

        questions.add(question(javaCore, QuestionType.MCQ, QuizDifficulty.EASY,
                "Which keyword is used to inherit a class in Java?",
                "The `extends` keyword is used for class inheritance in Java.", 1, createdBy,
                option("extends", true), option("implements", false),
                option("inherits", false), option("super", false)));

        questions.add(question(collections, QuestionType.MCQ, QuizDifficulty.MEDIUM,
                "Which collection provides average O(1) lookup by key?",
                "HashMap provides average O(1) lookup by key.", 2, createdBy,
                option("ArrayList", false), option("LinkedList", false),
                option("HashMap", true), option("TreeSet", false)));

        questions.add(question(javaCore, QuestionType.TRUE_FALSE, QuizDifficulty.EASY,
                "In Java, a class can extend multiple classes.",
                "Java does not support multiple inheritance of classes — only of interfaces.", 1, createdBy,
                option("True", false), option("False", true)));

        questions.add(question(collections, QuestionType.MULTIPLE_CORRECT, QuizDifficulty.MEDIUM,
                "Which of the following are part of the Java Collections Framework?",
                "ArrayList, HashMap and HashSet are all part of java.util; Thread is not a collection.", 2, createdBy,
                option("ArrayList", true), option("HashMap", true),
                option("Thread", false), option("HashSet", true)));

        questions.add(question(springBoot, QuestionType.MCQ, QuizDifficulty.HARD,
                "Which annotation marks a class as a REST controller in Spring Boot?",
                "@RestController combines @Controller and @ResponseBody for REST endpoints.", 2, createdBy,
                option("@Component", false), option("@RestController", true),
                option("@Service", false), option("@Repository", false)));

        questions = questionRepository.saveAll(questions);

        Quiz quiz = new Quiz();
        quiz.setTitle("Java Backend Assessment");
        quiz.setDescription("A short sample quiz covering Java core, collections and Spring Boot basics.");
        quiz.setType(QuizType.MCQ);
        quiz.setDifficulty(QuizDifficulty.MEDIUM);
        quiz.setDuration(20);
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

        log.info("Seeded sample quiz 'Java Backend Assessment' with {} bank questions", questions.size());
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
        Question question = new Question();
        question.setTopic(topic);
        question.setQuestionType(type);
        question.setDifficulty(difficulty);
        question.setQuestionText(text);
        question.setExplanation(explanation);
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
