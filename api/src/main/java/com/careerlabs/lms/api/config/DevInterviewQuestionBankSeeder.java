package com.careerlabs.lms.api.config;

import com.careerlabs.lms.api.quiz.entity.InterviewQuestion;
import com.careerlabs.lms.api.quiz.entity.QuizDifficulty;
import com.careerlabs.lms.api.quiz.repository.InterviewQuestionRepository;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Seeds the standalone interview Q&A bank (browsed on the student Interview Prep tab
 * via {@link com.careerlabs.lms.api.quiz.controller.InterviewPrepController}) with
 * real content spanning several categories, so the tab isn't empty out of the box.
 * Controlled by the same APP_SEED_ENABLED flag as the other dev seeders; only runs
 * while the interview_questions table is empty.
 */
@Component
@Order(5)
public class DevInterviewQuestionBankSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevInterviewQuestionBankSeeder.class);

    private record Entry(String category, String question, String answer, QuizDifficulty difficulty, String tags) {
    }

    private final InterviewQuestionRepository interviewQuestionRepository;
    private final UserRepository userRepository;
    private final boolean seedEnabled;

    public DevInterviewQuestionBankSeeder(InterviewQuestionRepository interviewQuestionRepository,
                                           UserRepository userRepository,
                                           @Value("${app.seed.enabled}") boolean seedEnabled) {
        this.interviewQuestionRepository = interviewQuestionRepository;
        this.userRepository = userRepository;
        this.seedEnabled = seedEnabled;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled || interviewQuestionRepository.count() > 0) {
            return;
        }

        Long createdBy = userRepository.findAll().stream().findFirst().map(u -> u.getId()).orElse(null);

        List<Entry> entries = List.of(
                new Entry("Java Core",
                        "What is the difference between == and .equals() in Java?",
                        "== compares object references (memory addresses) for objects, or primitive values for primitives. " +
                                ".equals() compares logical/content equality, and its behavior depends on whether the class " +
                                "overrides Object.equals() (String and the wrapper classes override it; a plain custom class " +
                                "without an override falls back to reference comparison).",
                        QuizDifficulty.EASY, "java,fundamentals"),

                new Entry("Java Core",
                        "Explain the difference between checked and unchecked exceptions.",
                        "Checked exceptions (subclasses of Exception, excluding RuntimeException) must be declared with " +
                                "throws or caught at compile time — e.g. IOException. Unchecked exceptions (subclasses of " +
                                "RuntimeException, like NullPointerException or IllegalArgumentException) aren't enforced by " +
                                "the compiler and typically signal programming errors rather than recoverable conditions.",
                        QuizDifficulty.MEDIUM, "java,exceptions"),

                new Entry("Java Core",
                        "What is the purpose of the volatile keyword?",
                        "volatile guarantees that reads/writes to a field go directly to main memory instead of a thread-local " +
                                "CPU cache, so changes made by one thread are immediately visible to others. It provides " +
                                "visibility, not atomicity — compound operations like count++ still need synchronization or " +
                                "an atomic type.",
                        QuizDifficulty.HARD, "java,concurrency"),

                new Entry("Java Core",
                        "What happens when you override equals() without overriding hashCode()?",
                        "You break the equals/hashCode contract: equal objects must have equal hash codes. Hash-based " +
                                "collections like HashMap or HashSet can then behave incorrectly — two 'equal' objects may " +
                                "land in different buckets, so lookups and duplicate detection silently fail.",
                        QuizDifficulty.MEDIUM, "java,collections"),

                new Entry("Spring Boot",
                        "What is dependency injection and how does Spring implement it?",
                        "Dependency injection is a pattern where an object's dependencies are supplied by an external " +
                                "container rather than constructed internally. Spring's IoC container creates and wires beans " +
                                "based on annotations (@Component/@Service/@Repository plus @Autowired or constructor " +
                                "injection) or explicit @Configuration classes, so classes stay decoupled and easily testable.",
                        QuizDifficulty.EASY, "spring,di"),

                new Entry("Spring Boot",
                        "What's the difference between @Component, @Service, and @Repository?",
                        "All three are stereotypes of @Component and get picked up by component scanning the same way. " +
                                "@Service and @Repository exist for semantic clarity — @Repository additionally enables " +
                                "Spring's automatic translation of persistence exceptions into DataAccessException.",
                        QuizDifficulty.EASY, "spring,annotations"),

                new Entry("Spring Boot",
                        "How would you secure a REST API with Spring Security and JWT?",
                        "Disable session-based auth (stateless session policy), add a filter that reads the Authorization " +
                                "header, validates the JWT signature/expiry, and populates the SecurityContext with an " +
                                "Authentication object before the request reaches a controller. Authorization rules are then " +
                                "expressed via path matchers or @PreAuthorize based on roles/claims embedded in the token.",
                        QuizDifficulty.HARD, "spring,security"),

                new Entry("Spring Boot",
                        "What is the N+1 query problem and how do you avoid it with JPA?",
                        "It happens when fetching a list of N parent entities lazily triggers one additional query per parent " +
                                "to load an association, resulting in N+1 total queries. Fixes include JOIN FETCH in JPQL, " +
                                "@EntityGraph, or batch fetching (hibernate.default_batch_fetch_size) to load associations in " +
                                "a single or a handful of queries.",
                        QuizDifficulty.HARD, "spring,jpa,performance"),

                new Entry("SQL & Databases",
                        "What is the difference between INNER JOIN and LEFT JOIN?",
                        "INNER JOIN returns only rows that have matching values in both tables. LEFT JOIN returns all rows " +
                                "from the left table plus matched rows from the right table, filling in NULLs where there's " +
                                "no match.",
                        QuizDifficulty.EASY, "sql,joins"),

                new Entry("SQL & Databases",
                        "What is database normalization, and what problem does it solve?",
                        "Normalization organizes tables/columns to reduce data redundancy and avoid update/insert/delete " +
                                "anomalies, typically by progressively applying normal forms (1NF removes repeating groups, " +
                                "2NF removes partial dependencies, 3NF removes transitive dependencies). The trade-off is " +
                                "more joins at query time, which is why read-heavy systems sometimes selectively denormalize.",
                        QuizDifficulty.MEDIUM, "sql,database-design"),

                new Entry("SQL & Databases",
                        "How does a database index speed up queries, and what's the cost of having one?",
                        "An index (commonly a B-tree) maintains a sorted structure over one or more columns so lookups avoid " +
                                "a full table scan, turning an O(n) scan into roughly O(log n). The cost is extra storage and " +
                                "slower writes, since every INSERT/UPDATE/DELETE must also update each index on that table.",
                        QuizDifficulty.MEDIUM, "sql,performance"),

                new Entry("System Design",
                        "How would you design a URL shortener like bit.ly?",
                        "Core pieces: a write path that generates a short, unique key (e.g. base62-encoded auto-increment ID " +
                                "or a hash with collision checks) and stores {key, longUrl} in a key-value store; a read path " +
                                "that looks up the key and issues a 301/302 redirect, fronted by a cache (e.g. Redis) since " +
                                "reads vastly outnumber writes. At scale, add sharding by key prefix, rate limiting, and " +
                                "analytics collected asynchronously so they don't sit on the redirect's critical path.",
                        QuizDifficulty.MEDIUM, "system-design,scalability"),

                new Entry("System Design",
                        "How do you design a rate limiter for a public API?",
                        "Token bucket or sliding-window-counter algorithms are common: each client gets a bucket that refills " +
                                "at a fixed rate and is decremented per request, allowing short bursts up to the bucket size " +
                                "while enforcing a steady average rate. For a distributed system, the counters live in a " +
                                "shared store like Redis (using atomic INCR + TTL) so limits are enforced consistently across " +
                                "instances.",
                        QuizDifficulty.HARD, "system-design,scalability"),

                new Entry("System Design",
                        "What's the difference between horizontal and vertical scaling?",
                        "Vertical scaling adds more resources (CPU/RAM) to a single machine — simple, but has a hard ceiling " +
                                "and a single point of failure. Horizontal scaling adds more machines and distributes load " +
                                "across them — it scales further and improves fault tolerance, but requires the application " +
                                "to be stateless (or externalize state) and adds coordination complexity like load balancing.",
                        QuizDifficulty.EASY, "system-design,scalability"),

                new Entry("Data Structures & Algorithms",
                        "What is the time complexity of common HashMap operations, and why?",
                        "Average-case O(1) for get/put/remove, because the key's hash determines the bucket directly. Worst " +
                                "case degrades to O(n) if many keys collide into the same bucket (mitigated in modern Java by " +
                                "treeifying long collision chains into a red-black tree, dropping worst case to O(log n)).",
                        QuizDifficulty.MEDIUM, "dsa,hashmap"),

                new Entry("Data Structures & Algorithms",
                        "When would you choose a linked list over an array, and vice versa?",
                        "Arrays give O(1) random access and better cache locality, but resizing or inserting/removing in the " +
                                "middle costs O(n). Linked lists give O(1) insertion/removal once you have a reference to the " +
                                "node, but O(n) random access and worse cache locality. Use arrays when you mostly read by " +
                                "index; use linked lists when you frequently insert/remove at known positions (e.g. a queue).",
                        QuizDifficulty.EASY, "dsa,fundamentals"),

                new Entry("Data Structures & Algorithms",
                        "Explain how binary search works and its time complexity.",
                        "Binary search repeatedly halves a sorted array's search range: compare the target to the middle " +
                                "element, and recurse into the left or right half depending on the comparison. Each step " +
                                "eliminates half the remaining elements, giving O(log n) time versus O(n) for a linear scan — " +
                                "the array must be sorted for this to work.",
                        QuizDifficulty.EASY, "dsa,searching"),

                new Entry("Behavioral",
                        "Tell me about a time you disagreed with a technical decision. How did you handle it?",
                        "A strong answer explains the disagreement's technical basis, shows you raised it constructively " +
                                "(data or concrete trade-offs, not just opinion), and describes the outcome — whether you " +
                                "convinced the team, learned why the original approach was right, or reached a documented " +
                                "compromise. Interviewers are listening for respectful pushback and the ability to commit to " +
                                "a team decision once it's made.",
                        QuizDifficulty.MEDIUM, "behavioral,communication"),

                new Entry("Behavioral",
                        "Describe a time you had to meet a tight deadline. What trade-offs did you make?",
                        "Focus on how you scoped the work: what you cut or deferred, how you communicated the trade-off to " +
                                "stakeholders, and how you managed any resulting technical debt afterward. Avoid implying you " +
                                "just worked longer hours with no prioritization — interviewers want to see deliberate " +
                                "trade-off decisions, not brute force.",
                        QuizDifficulty.EASY, "behavioral,time-management"),

                new Entry("Behavioral",
                        "How do you approach giving feedback to a teammate whose code quality is causing issues?",
                        "A private, specific, empathetic conversation focused on impact ('these bugs are reaching " +
                                "production because X') rather than blame, paired with a concrete offer to help (pairing, " +
                                "reviewing together, sharing resources) tends to land far better than public criticism or " +
                                "silently redoing their work.",
                        QuizDifficulty.MEDIUM, "behavioral,teamwork")
        );

        List<InterviewQuestion> saved = entries.stream().map(e -> {
            InterviewQuestion q = new InterviewQuestion();
            q.setCategory(e.category());
            q.setQuestionText(e.question());
            q.setAnswerText(e.answer());
            q.setDifficulty(e.difficulty());
            q.setTags(e.tags());
            q.setActive(true);
            q.setCreatedBy(createdBy);
            return q;
        }).toList();

        interviewQuestionRepository.saveAll(saved);

        log.info("Seeded {} interview prep questions across {} categories", saved.size(),
                entries.stream().map(Entry::category).distinct().count());
    }
}
