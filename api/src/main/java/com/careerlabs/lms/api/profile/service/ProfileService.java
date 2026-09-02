package com.careerlabs.lms.api.profile.service;

import com.careerlabs.lms.api.profile.dto.request.ChangePasswordRequest;
import com.careerlabs.lms.api.profile.dto.request.UpdateProfileRequest;
import com.careerlabs.lms.api.profile.dto.response.PhotoUploadResponse;
import com.careerlabs.lms.api.profile.dto.response.ProfileResponse;
import org.springframework.web.multipart.MultipartFile;

public interface ProfileService {

    ProfileResponse get(Long userId);

    ProfileResponse update(Long userId, UpdateProfileRequest request);

    void changePassword(Long userId, ChangePasswordRequest request);

    PhotoUploadResponse uploadPhoto(Long userId, MultipartFile file);
}
