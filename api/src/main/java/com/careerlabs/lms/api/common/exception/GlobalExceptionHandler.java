package com.careerlabs.lms.api.common.exception;

import com.careerlabs.lms.api.common.response.ApiErrorResponse;
import com.careerlabs.lms.api.common.response.ApiErrorResponse.FieldErrorDetail;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.List;

/**
 * Translates every exception thrown by controllers/services into the shared
 * {@link ApiErrorResponse} envelope, so clients always receive a consistent shape.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private static final String GENERIC_ERROR_MESSAGE =
            "Something went wrong on our end. Please try again a little later.";

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiErrorResponse> handleApiException(ApiException ex, HttpServletRequest request) {
        return buildResponse(ex.getStatus(), ex.getMessage(), request.getRequestURI(), null);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleBadCredentials(BadCredentialsException ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.UNAUTHORIZED, "Invalid email or password", request.getRequestURI(), null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<FieldErrorDetail> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> new FieldErrorDetail(fe.getField(), fe.getDefaultMessage()))
                .toList();
        String mainMessage = errors.isEmpty() ? "Validation failed" : errors.get(0).message();
        return buildResponse(HttpStatus.BAD_REQUEST, mainMessage, request.getRequestURI(), errors);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNoResourceFound(NoResourceFoundException ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.NOT_FOUND, "The requested file or resource was not found on the server", request.getRequestURI(), null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex, HttpServletRequest request) {
        log.error("Data integrity violation on {}", request.getRequestURI(), ex);
        String rootMsg = ex.getRootCause() != null ? ex.getRootCause().getMessage() : ex.getMessage();
        String userMessage;
        if (rootMsg != null && rootMsg.contains("duplicate key")) {
            userMessage = "A record with that value already exists. Please choose a different value and try again.";
        } else if (rootMsg != null && rootMsg.contains("NOT NULL")) {
            userMessage = "A required field is missing. Please fill in all required fields and try again.";
        } else if (rootMsg != null && rootMsg.contains("unique constraint") || rootMsg != null && rootMsg.contains("Unique")) {
            userMessage = "A record with that value already exists. Please choose a different value and try again.";
        } else if (rootMsg != null && rootMsg.contains("foreign key")) {
            userMessage = "This record is referenced by other data and cannot be modified as requested.";
        } else {
            userMessage = "That change conflicts with existing data. Root cause: " + rootMsg;
        }
        return buildResponse(HttpStatus.CONFLICT, userMessage, request.getRequestURI(), null);
    }

    @ExceptionHandler(EmptyResultDataAccessException.class)
    public ResponseEntity<ApiErrorResponse> handleEmptyResult(EmptyResultDataAccessException ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.NOT_FOUND, "The requested record was not found.", request.getRequestURI(), null);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleUnreadable(HttpMessageNotReadableException ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.BAD_REQUEST, "The request body is missing or malformed.", request.getRequestURI(), null);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingParam(MissingServletRequestParameterException ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.BAD_REQUEST, "A required request parameter is missing: " + ex.getParameterName(),
                request.getRequestURI(), null);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.BAD_REQUEST,
                "Invalid value for '" + ex.getName() + "'. Please check the format and try again.",
                request.getRequestURI(), null);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleMaxUpload(MaxUploadSizeExceededException ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.PAYLOAD_TOO_LARGE,
                "The uploaded file is too large. Please upload a smaller file.",
                request.getRequestURI(), null);
    }

    /**
     * Last-resort handler. Internal details are logged server-side and the client
     * receives a generic message so run-time/database errors (e.g. a query that
     * references a column missing from a legacy table) never surface raw SQL or
     * stack traces to the user.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception on {}", request.getRequestURI(), ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, GENERIC_ERROR_MESSAGE,
                request.getRequestURI(), null);
    }

    private ResponseEntity<ApiErrorResponse> buildResponse(HttpStatus status, String message, String path,
                                                             List<FieldErrorDetail> errors) {
        ApiErrorResponse body = new ApiErrorResponse(message, status.value(), path, errors);
        return ResponseEntity.status(status).body(body);
    }
}
