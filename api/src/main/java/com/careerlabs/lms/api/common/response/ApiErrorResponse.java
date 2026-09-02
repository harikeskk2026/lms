package com.careerlabs.lms.api.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;

/**
 * Standard envelope for every error API response.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiErrorResponse {

    private final boolean success = false;
    private final String message;
    private final int status;
    private final String path;
    private final List<FieldErrorDetail> errors;
    private final Instant timestamp = Instant.now();
    private String code;

    public ApiErrorResponse(String message, int status, String path, List<FieldErrorDetail> errors) {
        this.message = message;
        this.status = status;
        this.path = path;
        this.errors = errors;
    }

    public ApiErrorResponse(String message, int status, String path, List<FieldErrorDetail> errors, String code) {
        this(message, status, path, errors);
        this.code = code;
    }

    public String getCode() {
        return code;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public int getStatus() {
        return status;
    }

    public String getPath() {
        return path;
    }

    public List<FieldErrorDetail> getErrors() {
        return errors;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public record FieldErrorDetail(String field, String message) {
    }
}
