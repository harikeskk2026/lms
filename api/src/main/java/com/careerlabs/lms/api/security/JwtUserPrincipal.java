package com.careerlabs.lms.api.security;

/**
 * Lightweight authenticated-principal derived straight from JWT claims,
 * so request handling never has to hit the database just to know "who is this".
 */
public record JwtUserPrincipal(Long id, String email, String role) {
}
