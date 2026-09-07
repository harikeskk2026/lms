package com.careerlabs.lms.api.security;

import com.careerlabs.lms.api.auth.entity.RevokedToken;
import com.careerlabs.lms.api.auth.repository.RevokedTokenRepository;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenRevocationService {

    private static final Logger log = LoggerFactory.getLogger(TokenRevocationService.class);

    private final RevokedTokenRepository revokedTokenRepository;
    private final UserRepository userRepository;

    // Fast in-memory cache for revoked JTIs: jti -> expiresAt
    private final Map<String, Instant> revokedTokensCache = new ConcurrentHashMap<>();

    public TokenRevocationService(RevokedTokenRepository revokedTokenRepository,
                                  UserRepository userRepository) {
        this.revokedTokenRepository = revokedTokenRepository;
        this.userRepository = userRepository;
    }

    @PostConstruct
    public void init() {
        try {
            Instant now = Instant.now();
            revokedTokenRepository.findByExpiresAtAfter(now)
                    .forEach(t -> revokedTokensCache.put(t.getJti(), t.getExpiresAt()));
            log.info("Initialized {} revoked tokens from database", revokedTokensCache.size());
        } catch (Exception e) {
            log.warn("Could not preload revoked tokens from DB (tables may not be created yet): {}", e.getMessage());
        }
    }

    /**
     * Revoke a single token by its JTI. Persists to database and updates fast cache.
     */
    @Transactional
    public void revokeToken(String jti, Long userId, Instant expiresAt) {
        if (jti == null || jti.isBlank()) {
            return;
        }
        if (expiresAt == null) {
            expiresAt = Instant.now().plusSeconds(86400); // 24h fallback
        }

        // 1. Update cache immediately
        revokedTokensCache.put(jti, expiresAt);

        // 2. Persist to DB as source of truth
        if (!revokedTokenRepository.existsByJti(jti)) {
            RevokedToken entity = new RevokedToken(jti, userId, expiresAt);
            revokedTokenRepository.save(entity);
            log.debug("Revoked single token JTI {} for userId {}", jti, userId);
        }
    }

    /**
     * Checks if a single token's JTI is revoked. Database is the source of truth.
     */
    public boolean isTokenRevoked(String jti) {
        if (jti == null || jti.isBlank()) {
            return false;
        }

        // Check in-memory cache first
        Instant expiresAt = revokedTokensCache.get(jti);
        if (expiresAt != null) {
            if (expiresAt.isAfter(Instant.now())) {
                return true;
            } else {
                revokedTokensCache.remove(jti);
                return false;
            }
        }

        // Fallback to database check
        boolean existsInDb = revokedTokenRepository.existsByJti(jti);
        if (existsInDb) {
            revokedTokensCache.put(jti, Instant.now().plusSeconds(3600));
        }
        return existsInDb;
    }

    /**
     * Invalidate all sessions/tokens for the specified user by incrementing token_version in DB.
     */
    @Transactional
    public void revokeAllUserTokens(Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            int nextVersion = user.getTokenVersion() + 1;
            user.setTokenVersion(nextVersion);
            userRepository.save(user);

            // Clean up individual revoked tokens for this user since all prior tokens are now superseded by version
            try {
                revokedTokenRepository.deleteByUserId(userId);
            } catch (Exception ex) {
                log.warn("Could not clear revoked tokens for user {}: {}", userId, ex.getMessage());
            }

            log.info("Revoked all tokens for user {} (incremented tokenVersion to {})", userId, nextVersion);
        }
    }

    /**
     * Validates whether a token's version is still active according to the user's database record.
     * Returns:
     * - VALID: active user and tokenVersion matches current user tokenVersion
     * - USER_INACTIVE: user is disabled
     * - VERSION_MISMATCH: token was issued prior to a logout-all event
     * - USER_NOT_FOUND: user no longer exists
     */
    public TokenValidationResult validateUserToken(Long userId, Integer tokenVersion) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return TokenValidationResult.USER_NOT_FOUND;
        }

        User user = userOpt.get();
        if (!user.isActive()) {
            return TokenValidationResult.USER_INACTIVE;
        }

        // If the token was issued with a version lower than the user's current version, it's revoked
        if (tokenVersion == null || tokenVersion < user.getTokenVersion()) {
            return TokenValidationResult.VERSION_MISMATCH;
        }

        return TokenValidationResult.VALID;
    }

    public enum TokenValidationResult {
        VALID,
        USER_INACTIVE,
        VERSION_MISMATCH,
        USER_NOT_FOUND
    }

    /**
     * Periodic cleanup of expired tokens from database and in-memory cache.
     */
    @Scheduled(cron = "0 0 * * * *") // Every hour
    @Transactional
    public void cleanupExpiredTokens() {
        Instant now = Instant.now();
        revokedTokensCache.entrySet().removeIf(entry -> entry.getValue().isBefore(now));
        revokedTokenRepository.deleteByExpiresAtBefore(now);
    }
}
