package com.careerlabs.lms.api.auth.service;

import com.careerlabs.lms.api.auth.dto.request.ForgotPasswordRequest;
import com.careerlabs.lms.api.auth.dto.request.LoginRequest;
import com.careerlabs.lms.api.auth.dto.request.ResetPasswordRequest;
import com.careerlabs.lms.api.auth.dto.request.VerifyOtpRequest;
import com.careerlabs.lms.api.auth.dto.response.LoginResponse;
import com.careerlabs.lms.api.auth.dto.response.UserResponse;

public interface AuthService {

    LoginResponse login(LoginRequest request);

    UserResponse getCurrentUser(Long userId);

    void sendForgotPasswordOtp(ForgotPasswordRequest request);

    void verifyOtp(VerifyOtpRequest request);

    void resetPassword(ResetPasswordRequest request);
}

