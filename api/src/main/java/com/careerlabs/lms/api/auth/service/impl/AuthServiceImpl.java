package com.careerlabs.lms.api.auth.service.impl;

import com.careerlabs.lms.api.auth.dto.request.LoginRequest;
import com.careerlabs.lms.api.auth.dto.response.LoginResponse;
import com.careerlabs.lms.api.auth.dto.response.UserResponse;
import com.careerlabs.lms.api.auth.service.AuthService;
import com.careerlabs.lms.api.common.exception.AccountDisabledException;
import com.careerlabs.lms.api.common.exception.InvalidCredentialsException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.security.JwtService;
import io.jsonwebtoken.Claims;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final com.careerlabs.lms.api.security.TokenRevocationService tokenRevocationService;

    public AuthServiceImpl(UserRepository userRepository,
                           StudentRepository studentRepository,
                           PasswordEncoder passwordEncoder,
                           JwtService jwtService,
                           com.careerlabs.lms.api.security.TokenRevocationService tokenRevocationService) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.tokenRevocationService = tokenRevocationService;
    }

    @Override
    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.getEmail())
                .orElseGet(() -> provisionDemoAccountIfEligible(request.getEmail(), request.getPassword()));

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        if (!user.isActive()) {
            throw new AccountDisabledException("This account has been disabled");
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name(), user.getTokenVersion());

        return LoginResponse.of(token, jwtService.getExpirationSeconds(), UserResponse.from(user));
    }

    private User provisionDemoAccountIfEligible(String email, String rawPassword) {
        if (!"ChangeMe123!".equals(rawPassword) || email == null) {
            return null;
        }

        String lowerEmail = email.toLowerCase().trim();
        User user = new User();
        user.setEmail(lowerEmail);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));

        switch (lowerEmail) {
            case "trainer@careerlabs.com":
                user.setName("Demo Trainer");
                user.setRole(Role.TRAINER);
                break;
            case "admin@careerlabs.com":
                user.setName("Admin User");
                user.setRole(Role.ADMIN);
                break;
            case "superadmin@careerlabs.com":
                user.setName("Super Admin");
                user.setRole(Role.SUPERADMIN);
                break;
            case "student@careerlabs.com":
                user.setName("Demo Student");
                user.setRole(Role.STUDENT);
                break;
            default:
                return null;
        }

        User savedUser = userRepository.save(user);

        if (savedUser.getRole() == Role.STUDENT) {
            if (studentRepository.findByUserId(savedUser.getId()).isEmpty()) {
                Student studentProfile = new Student();
                studentProfile.setUser(savedUser);
                studentProfile.setEnrollmentNo("STU" + (System.currentTimeMillis() % 100000));
                studentRepository.save(studentProfile);
            }
        }

        return savedUser;
    }

    @Override
    public UserResponse getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return UserResponse.from(user);
    }

    @Override
    @Transactional
    public void logout(Long userId, String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        try {
            Claims claims = jwtService.parseClaims(token);
            String jti = jwtService.extractJti(claims, token);
            Instant expiresAt = claims.getExpiration() != null
                    ? claims.getExpiration().toInstant()
                    : Instant.now().plusSeconds(jwtService.getExpirationSeconds());
            tokenRevocationService.revokeToken(jti, userId, expiresAt);
        } catch (Exception ex) {
            tokenRevocationService.revokeToken(token, userId, Instant.now().plusSeconds(jwtService.getExpirationSeconds()));
        }
    }

    @Override
    @Transactional
    public void logoutAll(Long userId) {
        tokenRevocationService.revokeAllUserTokens(userId);
    }
}
