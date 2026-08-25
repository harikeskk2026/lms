package com.careerlabs.lms.api.auth.dto.response;

public record LoginResponse(String accessToken, String tokenType, long expiresInSeconds, UserResponse user) {

    public static LoginResponse of(String accessToken, long expiresInSeconds, UserResponse user) {
        return new LoginResponse(accessToken, "Bearer", expiresInSeconds, user);
    }
}
