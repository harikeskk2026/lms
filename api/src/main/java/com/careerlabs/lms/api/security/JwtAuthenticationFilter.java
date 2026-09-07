package com.careerlabs.lms.api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Reads the Bearer token (if any), validates it, and - on success - populates the
 * SecurityContext with a {@link JwtUserPrincipal} so downstream controllers/method
 * security can rely on the authenticated user without re-touching the database.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final String BEARER_PREFIX = "Bearer ";

    /**
     * Request attribute read by {@link RestAuthenticationEntryPoint} so the client can
     * tell an expired token (log out silently, no need to alarm the user) apart from a
     * malformed/tampered one.
     */
    public static final String JWT_ERROR_CODE_ATTRIBUTE = "jwt.error.code";

    private final JwtService jwtService;
    private final TokenRevocationService tokenRevocationService;

    public JwtAuthenticationFilter(JwtService jwtService, TokenRevocationService tokenRevocationService) {
        this.jwtService = jwtService;
        this.tokenRevocationService = tokenRevocationService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length());
            try {
                Claims claims = jwtService.parseClaims(token);
                Long userId = Long.valueOf(claims.getSubject());

                // 1. Check if this specific token was revoked (Sign Out)
                String jti = jwtService.extractJti(claims, token);
                if (tokenRevocationService.isTokenRevoked(jti)) {
                    log.debug("Rejecting revoked JWT with jti {} for user {}", jti, userId);
                    SecurityContextHolder.clearContext();
                    request.setAttribute(JWT_ERROR_CODE_ATTRIBUTE, "TOKEN_REVOKED");
                    filterChain.doFilter(request, response);
                    return;
                }

                // 2. Check if user is active and tokenVersion matches (Sign Out All Devices & Account Active status)
                Integer tokenVersion = jwtService.extractTokenVersion(claims);
                TokenRevocationService.TokenValidationResult validationResult =
                        tokenRevocationService.validateUserToken(userId, tokenVersion);

                if (validationResult == TokenRevocationService.TokenValidationResult.USER_INACTIVE) {
                    log.debug("Rejecting JWT for disabled user {}", userId);
                    SecurityContextHolder.clearContext();
                    request.setAttribute(JWT_ERROR_CODE_ATTRIBUTE, "ACCOUNT_DISABLED");
                    filterChain.doFilter(request, response);
                    return;
                } else if (validationResult != TokenRevocationService.TokenValidationResult.VALID) {
                    log.debug("Rejecting JWT with superseded version {} for user {}: {}", tokenVersion, userId, validationResult);
                    SecurityContextHolder.clearContext();
                    request.setAttribute(JWT_ERROR_CODE_ATTRIBUTE, "SESSION_EXPIRED");
                    filterChain.doFilter(request, response);
                    return;
                }

                JwtUserPrincipal principal = new JwtUserPrincipal(
                        userId,
                        claims.get("email", String.class),
                        claims.get("role", String.class));

                var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + principal.role()));
                var authentication = new UsernamePasswordAuthenticationToken(principal, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (ExpiredJwtException ex) {
                log.debug("Rejecting expired JWT: {}", ex.getMessage());
                SecurityContextHolder.clearContext();
                request.setAttribute(JWT_ERROR_CODE_ATTRIBUTE, "TOKEN_EXPIRED");
            } catch (JwtException | IllegalArgumentException ex) {
                log.debug("Rejecting invalid JWT: {}", ex.getMessage());
                SecurityContextHolder.clearContext();
                request.setAttribute(JWT_ERROR_CODE_ATTRIBUTE, "TOKEN_INVALID");
            }
        }

        filterChain.doFilter(request, response);
    }
}
