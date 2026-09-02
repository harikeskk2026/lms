package com.careerlabs.lms.api.placement.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.placement.dto.response.DriveApplicationResponse;
import com.careerlabs.lms.api.placement.dto.response.StudentDriveResponse;
import com.careerlabs.lms.api.placement.service.DriveApplicationService;
import com.careerlabs.lms.api.placement.service.DriveService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Students never apply to a company directly - the only action available here is
 * expressing interest. Admin controls everything downstream (review, shortlist,
 * resume sharing, final selection) via AdminDriveController.
 */
@RestController
@RequestMapping("/api/student/drives")
public class StudentDriveController {

    private final DriveService driveService;
    private final DriveApplicationService driveApplicationService;

    public StudentDriveController(DriveService driveService, DriveApplicationService driveApplicationService) {
        this.driveService = driveService;
        this.driveApplicationService = driveApplicationService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentDriveResponse>>> list(@AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(driveService.listForStudent(principal.id())));
    }

    @PostMapping("/{id}/interest")
    public ResponseEntity<ApiResponse<DriveApplicationResponse>> expressInterest(
            @PathVariable Long id, @AuthenticationPrincipal JwtUserPrincipal principal) {
        DriveApplicationResponse response = driveApplicationService.expressInterest(id, principal.id());
        return ResponseEntity.status(201).body(ApiResponse.of("Interest recorded", response));
    }
}
