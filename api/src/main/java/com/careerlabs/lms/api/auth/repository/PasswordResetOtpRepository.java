package com.careerlabs.lms.api.auth.repository;

import com.careerlabs.lms.api.auth.entity.PasswordResetOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Long> {

    Optional<PasswordResetOtp> findTopByEmailIgnoreCaseAndOtpAndUsedFalseAndExpiresAtAfterOrderByIdDesc(
            String email, String otp, Instant now);

    Optional<PasswordResetOtp> findTopByEmailIgnoreCaseAndUsedFalseAndExpiresAtAfterOrderByIdDesc(
            String email, Instant now);

    void deleteByEmailIgnoreCase(String email);
}
