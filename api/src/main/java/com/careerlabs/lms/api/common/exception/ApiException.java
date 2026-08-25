package com.careerlabs.lms.api.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Base type for exceptions that should be translated into a specific HTTP status
 * by the global exception handler.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
