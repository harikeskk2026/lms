package com.careerlabs.lms.api.enrollment.dto.response;

public record EnrollmentResultItem(
    Long studentId,
    String studentName,
    String email,
    boolean success,
    String message,
    Long enrollmentId
) {
    public static EnrollmentResultItem success(Long studentId, String name, String email,
                                               String message, Long enrollmentId) {
        return new EnrollmentResultItem(studentId, name, email, true, message, enrollmentId);
    }

    public static EnrollmentResultItem failure(Long studentId, String name, String email,
                                               String message) {
        return new EnrollmentResultItem(studentId, name, email, false, message, null);
    }
}
