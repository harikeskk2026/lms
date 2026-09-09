package com.careerlabs.lms.api.enrollment.dto.response;

/**
 * Contact details of the person students should reach out to when they want to
 * enroll in a course. Populated from real user records at runtime so the UI never
 * hardcodes a name, email, or phone number. Fields are null when no matching
 * staff member exists in the system.
 */
public record EnrollmentContactResponse(String name, String email, String phone, String designation) {
}