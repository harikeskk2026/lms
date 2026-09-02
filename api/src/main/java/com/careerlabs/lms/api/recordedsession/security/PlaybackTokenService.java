package com.careerlabs.lms.api.recordedsession.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

/**
 * Issues short-lived, purpose-specific tokens that authorize streaming ONE
 * recorded session's HLS manifest/segments/key for ONE student device. Reuses
 * the same signing secret as the normal login {@code JwtService} (one secret
 * to manage) but is a structurally distinct token — the {@code typ} claim
 * keeps it from ever being accepted on a normal authenticated route, and vice
 * versa a login token is never accepted by the stream endpoints.
 */
@Service
public class PlaybackTokenService {

    private static final String TOKEN_TYPE = "playback";

    private final SecretKey signingKey;
    private final long expirationSeconds;

    public PlaybackTokenService(@Value("${app.jwt.secret}") String secret,
                                 @Value("${app.playback-token.expiration-seconds}") long expirationSeconds) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationSeconds = expirationSeconds;
    }

    public String generateToken(Long studentUserId, Long recordedSessionId, String deviceId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(studentUserId))
                .claim("typ", TOKEN_TYPE)
                .claim("vid", recordedSessionId)
                .claim("dev", deviceId)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(expirationSeconds)))
                .signWith(signingKey)
                .compact();
    }

    public long getExpirationSeconds() {
        return expirationSeconds;
    }

    /**
     * Verifies signature/expiry and that this is a playback token (not a login
     * token). Throws {@link io.jsonwebtoken.JwtException} (or a subclass) —
     * including a plain {@link IllegalStateException} for a wrong {@code typ} —
     * on any failure.
     */
    public Claims parseClaims(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        if (!TOKEN_TYPE.equals(claims.get("typ", String.class))) {
            throw new IllegalStateException("Not a playback token");
        }
        return claims;
    }
}
