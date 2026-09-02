package com.careerlabs.lms.api.security;

import com.careerlabs.lms.api.common.response.ApiErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Turns "no/invalid credentials" into the same {@link ApiErrorResponse} shape
 * every other endpoint returns, instead of Spring Security's default HTML/empty body.
 */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public RestAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                          AuthenticationException authException) throws IOException {
        String code = (String) request.getAttribute(JwtAuthenticationFilter.JWT_ERROR_CODE_ATTRIBUTE);
        String message = "TOKEN_EXPIRED".equals(code)
                ? "Your session has expired. Please log in again."
                : "Authentication is required to access this resource";

        ApiErrorResponse body = new ApiErrorResponse(
                message,
                HttpStatus.UNAUTHORIZED.value(),
                request.getRequestURI(),
                null,
                code != null ? code : "UNAUTHENTICATED");

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), body);
    }
}
