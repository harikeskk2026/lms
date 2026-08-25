package com.careerlabs.lms.api.auth.service.impl;

import com.careerlabs.lms.api.auth.dto.request.LoginRequest;
import com.careerlabs.lms.api.auth.dto.response.LoginResponse;
import com.careerlabs.lms.api.auth.dto.response.UserResponse;
import com.careerlabs.lms.api.auth.service.AuthService;
import com.careerlabs.lms.api.common.exception.AccountDisabledException;
import com.careerlabs.lms.api.common.exception.InvalidCredentialsException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.security.JwtService;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
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
}
