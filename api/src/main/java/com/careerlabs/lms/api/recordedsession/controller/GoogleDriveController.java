package com.careerlabs.lms.api.recordedsession.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.recordedsession.service.GoogleDriveService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/drive")
public class GoogleDriveController {

    private final GoogleDriveService googleDriveService;

    public GoogleDriveController(GoogleDriveService googleDriveService) {
        this.googleDriveService = googleDriveService;
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatus() {
        return ResponseEntity.ok(ApiResponse.of(Map.of(
                "status", "CONNECTED",
                "service", "Google Drive API v3"
        )));
    }

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadFile(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "video", required = false) MultipartFile video,
            @RequestParam(value = "sessionId", defaultValue = "0") Long sessionId) {
        MultipartFile uploadFile = file != null ? file : video;
        if (uploadFile == null || uploadFile.isEmpty()) {
            throw new com.careerlabs.lms.api.common.exception.BadRequestException("A video file is required (form key 'file' or 'video')");
        }
        String fileId = googleDriveService.uploadFile(uploadFile, sessionId);
        return ResponseEntity.ok(ApiResponse.of("File uploaded to Google Drive", Map.of(
                "driveFileId", fileId,
                "fileName", uploadFile.getOriginalFilename() != null ? uploadFile.getOriginalFilename() : "video"
        )));
    }

    @DeleteMapping("/files/{fileId}")
    public ResponseEntity<ApiResponse<Void>> deleteFile(@PathVariable String fileId) {
        googleDriveService.deleteFile(fileId);
        return ResponseEntity.ok(ApiResponse.of("File deleted from Google Drive", null));
    }
}
