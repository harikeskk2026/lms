package com.careerlabs.lms.api.recordedsession.service;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Object;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Set;

/**
 * AWS S3 implementation of {@link VideoStorageService}.
 *
 * <p>Active when {@code app.s3.bucket} is non-blank (set via the {@code S3_BUCKET}
 * environment variable). FFmpeg still runs locally — this implementation writes
 * the source upload to a local temp directory, then after transcoding completes
 * {@link #publishTranscodedOutput} uploads the HLS output to S3. Segment and
 * manifest reads are served by streaming bytes from S3.
 *
 * <p>Credentials are resolved via the standard AWS Default Credentials Provider
 * Chain (env vars → ~/.aws/credentials → EC2/ECS instance role), so no secrets
 * are stored in application.yml.
 */
// Active when app.s3.bucket is non-blank (S3_BUCKET env var is set).
@Service
@ConditionalOnExpression("!'${app.s3.bucket:}'.isEmpty()")
public class S3VideoStorageService implements VideoStorageService {

    private static final Logger log = LoggerFactory.getLogger(S3VideoStorageService.class);

    private static final Set<String> ALLOWED_VIDEO_EXTENSIONS =
            Set.of("mp4", "mov", "mkv", "avi", "webm", "m4v");

    private final String bucket;
    private final String prefix;
    private final Path localTempRoot;
    private final S3Client s3;

    public S3VideoStorageService(
            @Value("${app.s3.bucket}") String bucket,
            @Value("${app.s3.region}") String region,
            @Value("${app.s3.prefix}") String prefix,
            @Value("${app.secure-video.dir}") String localTempDir) {
        this.bucket = bucket;
        this.prefix = prefix.endsWith("/") ? prefix : prefix + "/";
        this.localTempRoot = Path.of(localTempDir).toAbsolutePath().normalize();
        this.s3 = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
        log.info("S3VideoStorageService active — bucket={}, prefix={}", bucket, this.prefix);
    }

    // -------------------------------------------------------------------------
    // VideoStorageService implementation
    // -------------------------------------------------------------------------

    /**
     * Returns a local temp directory used by FFmpeg during transcoding.
     * Once {@link #publishTranscodedOutput} is called these local files are
     * deleted; they are never served directly.
     */
    @Override
    public Path sessionDir(Long recordedSessionId) {
        Path dir = localTempRoot.resolve(String.valueOf(recordedSessionId)).normalize();
        if (!dir.startsWith(localTempRoot)) {
            throw new BadRequestException("Invalid session directory");
        }
        return dir;
    }

    @Override
    public Path storeSourceUpload(MultipartFile file, Long recordedSessionId) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("A video file is required");
        }
        String originalName = StringUtils.cleanPath(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "video");
        String extension = extensionOf(originalName);
        if (!ALLOWED_VIDEO_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("Video type not allowed: ." + extension);
        }
        try {
            Path dir = sessionDir(recordedSessionId);
            Files.createDirectories(dir);
            Path target = dir.resolve("source." + extension).normalize();
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return target;
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to store uploaded video", e);
        }
    }

    /**
     * Uploads every HLS output file (*.m3u8, *.ts, *.key) from {@code outputDir}
     * to S3 under {@code {prefix}/{sessionId}/}. After uploading, the local temp
     * files are deleted to keep disk usage low on the API server.
     */
    @Override
    public void publishTranscodedOutput(Long recordedSessionId, Path outputDir) {
        try (var stream = Files.list(outputDir)) {
            stream.filter(p -> !p.getFileName().toString().startsWith("source."))
                    .forEach(file -> uploadFile(recordedSessionId, file));
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to list transcoded output directory", e);
        }
        // Clean up local temp files after successful upload
        deleteLocalDir(outputDir);
        log.info("Uploaded HLS output for session {} to S3 bucket {}", recordedSessionId, bucket);
    }

    @Override
    public byte[] getAssetBytes(Long recordedSessionId, String fileName) {
        validateFileName(fileName);
        String key = s3Key(recordedSessionId, fileName);
        return s3.getObjectAsBytes(
                GetObjectRequest.builder().bucket(bucket).key(key).build()
        ).asByteArray();
    }

    @Override
    public String getAssetText(Long recordedSessionId, String fileName) {
        return new String(getAssetBytes(recordedSessionId, fileName), StandardCharsets.UTF_8);
    }

    @Override
    public void deleteSessionAssets(Long recordedSessionId) {
        String sessionPrefix = prefix + recordedSessionId + "/";
        ListObjectsV2Request listReq = ListObjectsV2Request.builder()
                .bucket(bucket)
                .prefix(sessionPrefix)
                .build();
        s3.listObjectsV2(listReq).contents().stream()
                .map(S3Object::key)
                .forEach(key -> s3.deleteObject(
                        DeleteObjectRequest.builder().bucket(bucket).key(key).build()));
        log.info("Deleted all S3 assets for session {} under prefix {}", recordedSessionId, sessionPrefix);

        // Also remove any residual local temp files
        deleteLocalDir(sessionDir(recordedSessionId));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private void uploadFile(Long recordedSessionId, Path file) {
        String key = s3Key(recordedSessionId, file.getFileName().toString());
        try {
            s3.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(contentTypeOf(file.getFileName().toString()))
                            .build(),
                    RequestBody.fromFile(file)
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload " + file.getFileName() + " to S3", e);
        }
    }

    private String s3Key(Long recordedSessionId, String fileName) {
        return prefix + recordedSessionId + "/" + fileName;
    }

    private void validateFileName(String fileName) {
        if (fileName == null || fileName.isBlank()
                || fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            throw new BadRequestException("Invalid file name");
        }
    }

    private String contentTypeOf(String fileName) {
        if (fileName.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
        if (fileName.endsWith(".ts"))   return "video/MP2T";
        if (fileName.endsWith(".key"))  return "application/octet-stream";
        return "application/octet-stream";
    }

    private void deleteLocalDir(Path dir) {
        if (!Files.exists(dir)) return;
        try (var stream = Files.walk(dir)) {
            stream.sorted((a, b) -> b.compareTo(a)).forEach(p -> {
                try { Files.deleteIfExists(p); } catch (IOException ignored) {}
            });
        } catch (IOException e) {
            log.warn("Could not clean up local temp dir {}: {}", dir, e.getMessage());
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
