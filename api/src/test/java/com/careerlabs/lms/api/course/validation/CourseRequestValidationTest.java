package com.careerlabs.lms.api.course.validation;

import com.careerlabs.lms.api.course.dto.request.CourseRequest;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.entity.Level;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class CourseRequestValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            validator = factory.getValidator();
        }
    }

    private CourseRequest validRequest() {
        CourseRequest r = new CourseRequest();
        r.setTitle("Test Course");
        r.setDescription("A test course description");
        r.setDuration("3 months");
        r.setLevel(Level.BEGINNER);
        r.setStatus(CourseStatus.DRAFT);
        return r;
    }

    private Set<ConstraintViolation<CourseRequest>> validate(CourseRequest r) {
        return validator.validate(r);
    }

    // ── Valid formats ──────────────────────────────────────────────

    @Test
    @DisplayName("Accept '3 months'")
    void valid_months() {
        CourseRequest r = validRequest();
        r.setDuration("3 months");
        assertTrue(validate(r).isEmpty());
    }

    @Test
    @DisplayName("Accept '4 weeks'")
    void valid_weeks() {
        CourseRequest r = validRequest();
        r.setDuration("4 weeks");
        assertTrue(validate(r).isEmpty());
    }

    @Test
    @DisplayName("Accept '10 days'")
    void valid_days() {
        CourseRequest r = validRequest();
        r.setDuration("10 days");
        assertTrue(validate(r).isEmpty());
    }

    @Test
    @DisplayName("Accept '1 years'")
    void valid_years() {
        CourseRequest r = validRequest();
        r.setDuration("1 years");
        assertTrue(validate(r).isEmpty());
    }

    @Test
    @DisplayName("Accept '2 Weeks' (case-insensitive)")
    void valid_case_insensitive() {
        CourseRequest r = validRequest();
        r.setDuration("2 Weeks");
        assertTrue(validate(r).isEmpty());
    }

    @Test
    @DisplayName("Accept '1 day' (singular accepted at API boundary)")
    void valid_singular_day() {
        CourseRequest r = validRequest();
        r.setDuration("1 day");
        assertTrue(validate(r).isEmpty());
    }

    @Test
    @DisplayName("Accept '1 week' (singular)")
    void valid_singular_week() {
        CourseRequest r = validRequest();
        r.setDuration("1 week");
        assertTrue(validate(r).isEmpty());
    }

    @Test
    @DisplayName("Accept '1 month' (singular)")
    void valid_singular_month() {
        CourseRequest r = validRequest();
        r.setDuration("1 month");
        assertTrue(validate(r).isEmpty());
    }

    @Test
    @DisplayName("Accept '1 year' (singular)")
    void valid_singular_year() {
        CourseRequest r = validRequest();
        r.setDuration("1 year");
        assertTrue(validate(r).isEmpty());
    }

    // ── Rejected: hours ────────────────────────────────────────────

    @Test
    @DisplayName("Reject '40 hours'")
    void reject_hours() {
        CourseRequest r = validRequest();
        r.setDuration("40 hours");
        assertFalse(validate(r).isEmpty());
    }

    @Test
    @DisplayName("Reject '100 hrs'")
    void reject_hrs() {
        CourseRequest r = validRequest();
        r.setDuration("100 hrs");
        assertFalse(validate(r).isEmpty());
    }

    @Test
    @DisplayName("Reject '5 h'")
    void reject_h() {
        CourseRequest r = validRequest();
        r.setDuration("5 h");
        assertFalse(validate(r).isEmpty());
    }

    // ── Rejected: free text ────────────────────────────────────────

    @Test
    @DisplayName("Reject 'Self-paced'")
    void reject_self_paced() {
        CourseRequest r = validRequest();
        r.setDuration("Self-paced");
        assertFalse(validate(r).isEmpty());
    }

    @Test
    @DisplayName("Reject 'Flexible'")
    void reject_flexible() {
        CourseRequest r = validRequest();
        r.setDuration("Flexible");
        assertFalse(validate(r).isEmpty());
    }

    // ── Rejected: non-positive ─────────────────────────────────────

    @Test
    @DisplayName("Reject '0 weeks'")
    void reject_zero() {
        CourseRequest r = validRequest();
        r.setDuration("0 weeks");
        assertFalse(validate(r).isEmpty());
    }

    @Test
    @DisplayName("Reject '-2 months'")
    void reject_negative() {
        CourseRequest r = validRequest();
        r.setDuration("-2 months");
        assertFalse(validate(r).isEmpty());
    }

    // ── Rejected: arbitrary formats ────────────────────────────────

    @Test
    @DisplayName("Reject '2 months 3 days' (compound)")
    void reject_compound() {
        CourseRequest r = validRequest();
        r.setDuration("2 months 3 days");
        assertFalse(validate(r).isEmpty());
    }

    @Test
    @DisplayName("Reject 'six weeks' (word number)")
    void reject_word_number() {
        CourseRequest r = validRequest();
        r.setDuration("six weeks");
        assertFalse(validate(r).isEmpty());
    }

    // ── Rejected: empty / blank ────────────────────────────────────

    @Test
    @DisplayName("Reject null")
    void reject_null() {
        CourseRequest r = validRequest();
        r.setDuration(null);
        assertFalse(validate(r).isEmpty());
    }

    @Test
    @DisplayName("Reject empty string")
    void reject_empty() {
        CourseRequest r = validRequest();
        r.setDuration("");
        assertFalse(validate(r).isEmpty());
    }

    @Test
    @DisplayName("Reject blank string")
    void reject_blank() {
        CourseRequest r = validRequest();
        r.setDuration("   ");
        assertFalse(validate(r).isEmpty());
    }
}
