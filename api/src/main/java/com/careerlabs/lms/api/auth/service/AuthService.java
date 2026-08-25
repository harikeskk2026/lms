package com.careerlabs.lms.api.auth.service;

import com.careerlabs.lms.api.auth.dto.request.LoginRequest;
import com.careerlabs.lms.api.auth.dto.response.LoginResponse;

public interface AuthService {

    LoginResponse login(LoginRequest request);
}
