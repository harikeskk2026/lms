package com.careerlabs.lms.api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationSeconds;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                       @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationSeconds = expirationMs / 1000;
    }

    public String generateToken(Long userId, String email, String role) {
        return generateToken(userId, email, role, 1);
    }

    public String generateToken(Long userId, String email, String role, int tokenVersion) {
        Instant now = Instant.now();
        return Jwts.builder()
                .id(java.util.UUID.randomUUID().toString())
                .subject(String.valueOf(userId))
                .claim("email", email)
                .claim("role", role)
                .claim("tokenVersion", tokenVersion)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(expirationSeconds)))
                .signWith(signingKey)
                .compact();
    }

    public long getExpirationSeconds() {
        return expirationSeconds;
    }

    /**
     * Verifies the token signature/expiry and returns its claims.
     * Throws {@link io.jsonwebtoken.JwtException} (or a subclass) when the token is invalid.
     */
    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractJti(Claims claims, String rawToken) {
        String jti = claims.getId();
        if (jti != null && !jti.isBlank()) {
            return jti;
        }
        // Fallback: SHA-256 hash of the raw token if jti claim was missing
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return rawToken.length() > 64 ? rawToken.substring(rawToken.length() - 64) : rawToken;
        }
    }

    public Integer extractTokenVersion(Claims claims) {
        return claims.get("tokenVersion", Integer.class);
    }
}
