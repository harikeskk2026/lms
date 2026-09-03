package com.careerlabs.lms.api.auth.dto.response;

import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;

public record UserResponse(Long id, String name, String email, Role role, String photoUrl) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getPhotoUrl());
    }
}
