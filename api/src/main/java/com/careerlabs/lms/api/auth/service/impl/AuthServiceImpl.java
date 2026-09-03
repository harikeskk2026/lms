package com.careerlabs.lms.api.auth.service.impl;

import com.careerlabs.lms.api.auth.dto.request.ForgotPasswordRequest;

import com.careerlabs.lms.api.auth.dto.request.LoginRequest;
import com.careerlabs.lms.api.auth.dto.request.ResetPasswordRequest;
import com.careerlabs.lms.api.auth.dto.request.VerifyOtpRequest;
import com.careerlabs.lms.api.auth.dto.response.LoginResponse;
import com.careerlabs.lms.api.auth.dto.response.UserResponse;
import com.careerlabs.lms.api.auth.entity.PasswordResetOtp;
import com.careerlabs.lms.api.auth.repository.PasswordResetOtpRepository;
import com.careerlabs.lms.api.auth.service.AuthService;
import com.careerlabs.lms.api.common.exception.AccountDisabledException;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.InvalidCredentialsException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.mail.EmailService;
import com.careerlabs.lms.api.security.JwtService;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordResetOtpRepository otpRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthServiceImpl(UserRepository userRepository,
                           PasswordResetOtpRepository otpRepository,
                           PasswordEncoder passwordEncoder,
                           JwtService jwtService,
                           EmailService emailService) {
        this.userRepository = userRepository;
        this.otpRepository = otpRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
    }

    @Override
    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.getEmail())
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        if (!user.isActive()) {
            throw new AccountDisabledException("This account has been disabled");
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name());

        return LoginResponse.of(token, jwtService.getExpirationSeconds(), UserResponse.from(user));
    }

    @Override
    public UserResponse getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return UserResponse.from(user);
    }

    @Override
    @Transactional
    public void sendForgotPasswordOtp(ForgotPasswordRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("No account found with this email address"));

        if (!user.isActive()) {
            throw new AccountDisabledException("This account has been disabled");
        }

        otpRepository.deleteByEmailIgnoreCase(request.getEmail());

        String otp = String.format("%06d", secureRandom.nextInt(1000000));
        Instant expiresAt = Instant.now().plusSeconds(600); // 10 minutes

        PasswordResetOtp resetOtp = new PasswordResetOtp(user.getEmail(), otp, expiresAt);
        otpRepository.save(resetOtp);

        emailService.sendOtpEmail(user.getEmail(), otp);
    }

    @Override
    @Transactional(readOnly = true)
    public void verifyOtp(VerifyOtpRequest request) {
        otpRepository.findTopByEmailIgnoreCaseAndOtpAndUsedFalseAndExpiresAtAfterOrderByIdDesc(
                request.getEmail(), request.getOtp(), Instant.now())
                .orElseThrow(() -> new BadRequestException("Invalid or expired OTP"));
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (request.getConfirmPassword() != null && !request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Passwords do not match");
        }

        PasswordResetOtp resetOtp = otpRepository
                .findTopByEmailIgnoreCaseAndOtpAndUsedFalseAndExpiresAtAfterOrderByIdDesc(
                        request.getEmail(), request.getOtp(), Instant.now())
                .orElseThrow(() -> new BadRequestException("Invalid or expired OTP"));

        User user = userRepository.findByEmailIgnoreCase(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        resetOtp.setUsed(true);
        otpRepository.save(resetOtp);
    }
}

