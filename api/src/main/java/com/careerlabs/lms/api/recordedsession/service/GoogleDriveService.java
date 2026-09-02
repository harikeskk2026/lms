package com.careerlabs.lms.api.recordedsession.service;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.FileContent;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.File;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.Set;

/**
 * Handles video file operations with Google Drive API v3:
 * <ul>
 *   <li>Uploading raw video source files to Google Drive</li>
 *   <li>Downloading Drive files to local temp directory for FFmpeg transcoding</li>
 *   <li>Deleting Drive files after transcoding & S3 upload complete</li>
 * </ul>
 */
@Service
public class GoogleDriveService {

    private static final Logger log = LoggerFactory.getLogger(GoogleDriveService.class);
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("mp4", "mov", "mkv", "avi", "webm", "m4v");
    private static final long MAX_VIDEO_SIZE_BYTES = 400L * 1024 * 1024; // 400 MB
    private static final String TOKENS_DIRECTORY_PATH = "credentials/tokens";
    private static final String USER_ID = "user";

    @Value("${app.google-drive.folder-id:}")
    private String folderId;

    @Value("${app.secure-video.dir:secure-video}")
    private String localTempDir;

    @Value("${app.google-drive.refresh-token:}")
    private String refreshTokenConfig;

    @Value("${server.port:8081}")
    private String serverPort;

    private synchronized Drive getDrive() throws Exception {
        java.io.File clientSecretFile = new java.io.File("credentials/client_secret.json");
        if (!clientSecretFile.exists()) {
            throw new IllegalStateException("Google Drive credentials not found at credentials/client_secret.json");
        }

        GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(
                GsonFactory.getDefaultInstance(), new FileReader(clientSecretFile));

        GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                clientSecrets,
                Collections.singletonList(DriveScopes.DRIVE_FILE))
                .setDataStoreFactory(new FileDataStoreFactory(new java.io.File(TOKENS_DIRECTORY_PATH)))
                .setAccessType("offline")
                .build();

        Credential credential = flow.loadCredential(USER_ID);
        if (credential == null && refreshTokenConfig != null && !refreshTokenConfig.isBlank()) {
            credential = new com.google.api.client.googleapis.auth.oauth2.GoogleCredential.Builder()
                    .setTransport(GoogleNetHttpTransport.newTrustedTransport())
                    .setJsonFactory(GsonFactory.getDefaultInstance())
                    .setClientSecrets(clientSecrets)
                    .build()
                    .setRefreshToken(refreshTokenConfig);
        }

        if (credential == null) {
            throw new IllegalStateException("Google Drive is not authorized yet. Please open http://localhost:"
                    + serverPort + "/oauth2/authorize in your browser to grant permission first.");
        }

        return new Drive.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                credential)
                .setApplicationName("CareerLabs LMS")
                .build();
    }

    /**
     * Uploads an incoming video file to Google Drive.
     * @return Google Drive File ID
     */
    public String uploadFile(MultipartFile file, Long recordedSessionId) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("A video file is required");
        }
        if (file.getSize() > MAX_VIDEO_SIZE_BYTES) {
            throw new BadRequestException("Video file size exceeds the maximum allowed limit of 400MB");
        }
        String originalName = StringUtils.cleanPath(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "video");
        String extension = extensionOf(originalName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("Video type not allowed: ." + extension);
        }

        try {
            java.io.File tempFile = java.io.File.createTempFile("upload-", "-" + originalName);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, tempFile.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            }

            File fileMetadata = new File();
            fileMetadata.setName(originalName);
            if (folderId != null && !folderId.isBlank()) {
                fileMetadata.setParents(Collections.singletonList(folderId));
            }

            FileContent mediaContent = new FileContent(file.getContentType(), tempFile);
            File uploaded = getDrive().files().create(fileMetadata, mediaContent)
                    .setFields("id, name")
                    .execute();

            tempFile.delete();
            log.info("Uploaded video to Google Drive for session {}: ID={}", recordedSessionId, uploaded.getId());
            return uploaded.getId();
        } catch (Exception e) {
            log.error("Failed to upload video to Google Drive for session {}", recordedSessionId, e);
            throw new RuntimeException(e.getMessage() != null ? e.getMessage() : "Failed to upload video to Google Drive", e);
        }
    }

    /**
     * Downloads a Google Drive video file to local temp directory for FFmpeg transcoding.
     * @return Path to local temp file
     */
    public Path downloadToTemp(String driveFileId, Long recordedSessionId, String extension) {
        try {
            Path dir = Path.of(localTempDir, String.valueOf(recordedSessionId)).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            Path target = dir.resolve("source." + extension);

            try (InputStream in = getDrive().files().get(driveFileId).executeMediaAsInputStream();
                 OutputStream out = new FileOutputStream(target.toFile())) {
                in.transferTo(out);
            }

            log.info("Downloaded Drive file {} to local temp path {}", driveFileId, target);
            return target;
        } catch (Exception e) {
            log.error("Failed to download video from Google Drive for file ID {}", driveFileId, e);
            throw new RuntimeException("Failed to download video from Google Drive", e);
        }
    }

    /**
     * Deletes a file from Google Drive.
     */
    public void deleteFile(String driveFileId) {
        if (driveFileId == null || driveFileId.isBlank()) return;
        try {
            getDrive().files().delete(driveFileId).execute();
            log.info("Deleted source file from Google Drive: ID={}", driveFileId);
        } catch (Exception e) {
            log.warn("Failed to delete Google Drive file ID {}: {}", driveFileId, e.getMessage());
        }
    }

    private String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            throw new BadRequestException("File must have a valid extension");
        }
        return filename.substring(dot + 1).toLowerCase();
    }
}
