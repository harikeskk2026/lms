package com.careerlabs.lms.api.profile.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.profile.dto.request.ChangePasswordRequest;
import com.careerlabs.lms.api.profile.dto.request.UpdateProfileRequest;
import com.careerlabs.lms.api.profile.dto.response.PhotoUploadResponse;
import com.careerlabs.lms.api.profile.dto.response.ProfileResponse;
import com.careerlabs.lms.api.profile.service.ProfileService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * "My Profile", shared by every role. The account acted on is always the caller's
 * own - resolved from the JWT principal, never from a path/body id - so there is
 * no way for one account to read or edit another's profile through this surface.
 */
@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ProfileResponse>> get(@AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(profileService.get(principal.id())));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<ProfileResponse>> update(@Valid @RequestBody UpdateProfileRequest request,
                                                                  @AuthenticationPrincipal JwtUserPrincipal principal) {
        ProfileResponse response = profileService.update(principal.id(), request);
        return ResponseEntity.ok(ApiResponse.of("Profile updated", response));
    }

    @PostMapping(path = "/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<PhotoUploadResponse>> uploadPhoto(@RequestPart("file") MultipartFile file,
                                                                           @AuthenticationPrincipal JwtUserPrincipal principal) {
        PhotoUploadResponse response = profileService.uploadPhoto(principal.id(), file);
        return ResponseEntity.ok(ApiResponse.of("Profile photo updated", response));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                                               @AuthenticationPrincipal JwtUserPrincipal principal) {
        profileService.changePassword(principal.id(), request);
        return ResponseEntity.ok(ApiResponse.of("Password changed", null));
    }
}
