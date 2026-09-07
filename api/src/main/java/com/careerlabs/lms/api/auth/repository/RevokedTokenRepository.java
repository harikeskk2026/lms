package com.careerlabs.lms.api.auth.repository;

import com.careerlabs.lms.api.auth.entity.RevokedToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface RevokedTokenRepository extends JpaRepository<RevokedToken, Long> {

    boolean existsByJti(String jti);

    void deleteByUserId(Long userId);

    void deleteByExpiresAtBefore(Instant now);

    List<RevokedToken> findByExpiresAtAfter(Instant now);
}
