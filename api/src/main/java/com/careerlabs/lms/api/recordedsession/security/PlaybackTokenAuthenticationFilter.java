package com.careerlabs.lms.api.recordedsession.security;

import io.jsonwebtoken.Claims;
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
 * Authenticates the stream endpoints (manifest/segments/key) from a {@code ?token=}
 * query parameter instead of an Authorization header — HLS/video players can't
 * attach custom headers to the requests their internal network stack issues for
 * playlist/segment/key URLs. This filter only ever runs on the narrow
 * {@code /api/student/recorded-sessions/*}/stream/** security matcher (see
 * SecurityConfig's second filter chain) — it never touches the normal login-JWT path.
 */
@Component
public class PlaybackTokenAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(PlaybackTokenAuthenticationFilter.class);

    private final PlaybackTokenService playbackTokenService;

    public PlaybackTokenAuthenticationFilter(PlaybackTokenService playbackTokenService) {
        this.playbackTokenService = playbackTokenService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
        String token = request.getParameter("token");

        if (token != null && !token.isBlank()) {
            try {
                Claims claims = playbackTokenService.parseClaims(token);
                PlaybackTokenPrincipal principal = new PlaybackTokenPrincipal(
                        Long.valueOf(claims.getSubject()),
                        claims.get("vid", Long.class),
                        claims.get("dev", String.class));

                var authorities = List.of(new SimpleGrantedAuthority("ROLE_PLAYBACK"));
                var authentication = new UsernamePasswordAuthenticationToken(principal, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (JwtException | IllegalArgumentException | IllegalStateException ex) {
                log.debug("Rejecting invalid playback token: {}", ex.getMessage());
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}
