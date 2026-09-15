package com.careerlabs.lms.api.quiz.entity;

import com.careerlabs.lms.api.course.entity.Course;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "questions")
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id")
    private QuizTopic topic;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Course course;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false)
    private QuestionType questionType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuizDifficulty difficulty = QuizDifficulty.MEDIUM;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "code_snippet", columnDefinition = "TEXT")
    private String codeSnippet;

    /**
     * How this question is answered/graded. {@code OPTIONS} (default) is the
     * original MCQ-style mode and covers every question created before this
     * column existed (backfilled by migration V8). {@code FREE_TEXT} is used
     * only by SHORT_ANSWER (auto-graded against {@link #correctAnswerText}).
     * Coding/SQL free-text authoring was dropped — there's no sandboxed
     * execution to grade them — so SQL stays options-based only, as before.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "answer_mode", nullable = false)
    private AnswerMode answerMode = AnswerMode.OPTIONS;

    /** SHORT_ANSWER grading key only; normalized-text-compared against the student's answer. */
    @Column(name = "correct_answer_text", columnDefinition = "TEXT")
    private String correctAnswerText;

    /**
     * Unused since Coding/SQL free-text authoring was dropped; kept only so
     * historical rows created while that feature briefly existed still load.
     */
    @Column(name = "reference_answer", columnDefinition = "TEXT")
    private String referenceAnswer;

    /**
     * Unused since Coding/SQL free-text authoring was dropped; kept only so
     * historical rows created while that feature briefly existed still load.
     */
    @Column(name = "answer_language")
    private String answerLanguage;

    @Column(nullable = false)
    private Integer points = 1;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_by")
    private Long createdBy;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<QuestionOption> options = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public QuizTopic getTopic() {
        return topic;
    }

    public void setTopic(QuizTopic topic) {
        this.topic = topic;
    }

    public Course getCourse() {
        return course;
    }

    public void setCourse(Course course) {
        this.course = course;
    }

    public String getQuestionText() {
        return questionText;
    }

    public void setQuestionText(String questionText) {
        this.questionText = questionText;
    }

    public QuestionType getQuestionType() {
        return questionType;
    }

    public void setQuestionType(QuestionType questionType) {
        this.questionType = questionType;
    }

    public QuizDifficulty getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(QuizDifficulty difficulty) {
        this.difficulty = difficulty;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public String getCodeSnippet() {
        return codeSnippet;
    }

    public void setCodeSnippet(String codeSnippet) {
        this.codeSnippet = codeSnippet;
    }

    public AnswerMode getAnswerMode() {
        return answerMode;
    }

    public void setAnswerMode(AnswerMode answerMode) {
        this.answerMode = answerMode;
    }

    public String getCorrectAnswerText() {
        return correctAnswerText;
    }

    public void setCorrectAnswerText(String correctAnswerText) {
        this.correctAnswerText = correctAnswerText;
    }

    public String getReferenceAnswer() {
        return referenceAnswer;
    }

    public void setReferenceAnswer(String referenceAnswer) {
        this.referenceAnswer = referenceAnswer;
    }

    public String getAnswerLanguage() {
        return answerLanguage;
    }

    public void setAnswerLanguage(String answerLanguage) {
        this.answerLanguage = answerLanguage;
    }

    public Integer getPoints() {
        return points;
    }

    public void setPoints(Integer points) {
        this.points = points;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public List<QuestionOption> getOptions() {
        return options;
    }

    public void setOptions(List<QuestionOption> options) {
        this.options = options;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
