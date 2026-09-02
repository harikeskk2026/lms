package com.careerlabs.lms.api.recordedsession.service;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Set;

/**
 * Local-disk implementation of {@link VideoStorageService}.
 *
 * <p>Active when {@code app.s3.bucket} is blank (the default for local / dev).
 * The directory at {@code app.secure-video.dir} must NEVER be registered as a
 * static-resource handler — every read goes through an authenticated controller.
 */
// Active when app.s3.bucket is blank (default) — i.e. local/dev mode.
@Service
@ConditionalOnExpression("'${app.s3.bucket:}'.isEmpty()")
public class LocalVideoStorageService implements VideoStorageService {

    private static final Set<String> ALLOWED_VIDEO_EXTENSIONS =
            Set.of("mp4", "mov", "mkv", "avi", "webm", "m4v");
    private static final long MAX_VIDEO_SIZE_BYTES = 400L * 1024 * 1024; // 400 MB

    private final Path root;

    public LocalVideoStorageService(@Value("${app.secure-video.dir}") String secureVideoDir) {
        this.root = Path.of(secureVideoDir).toAbsolutePath().normalize();
    }

    // -------------------------------------------------------------------------
    // VideoStorageService implementation
    // -------------------------------------------------------------------------

    @Override
    public Path sessionDir(Long recordedSessionId) {
        Path dir = root.resolve(String.valueOf(recordedSessionId)).normalize();
        if (!dir.startsWith(root)) {
            throw new BadRequestException("Invalid session directory");
        }
        return dir;
    }

    @Override
    public Path storeSourceUpload(MultipartFile file, Long recordedSessionId) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("A video file is required");
        }
        if (file.getSize() > MAX_VIDEO_SIZE_BYTES) {
            throw new BadRequestException("Video file size exceeds the maximum allowed limit of 400MB");
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
     * No-op for local storage: FFmpeg already writes its output directly into
     * {@link #sessionDir(Long)}, so there is nothing to copy.
     */
    @Override
    public void publishTranscodedOutput(Long recordedSessionId, Path outputDir) {
        // Files are already in the correct location on local disk.
    }

    @Override
    public byte[] getAssetBytes(Long recordedSessionId, String fileName) {
        Path resolved = resolveAsset(recordedSessionId, fileName);
        try {
            return Files.readAllBytes(resolved);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read video asset: " + fileName, e);
        }
    }

    @Override
    public String getAssetText(Long recordedSessionId, String fileName) {
        Path resolved = resolveAsset(recordedSessionId, fileName);
        try {
            return Files.readString(resolved, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read manifest: " + fileName, e);
        }
    }

    @Override
    public void deleteSessionAssets(Long recordedSessionId) {
        Path dir = sessionDir(recordedSessionId);
        if (!Files.exists(dir)) return;
        try (var stream = Files.walk(dir)) {
            stream.sorted((a, b) -> b.compareTo(a)).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                    // best-effort cleanup
                }
            });
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to delete session directory", e);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers — kept package-private for VideoTranscodingService which still
    // needs sessionDir() to build the local FFmpeg output paths.
    // -------------------------------------------------------------------------

    /**
     * Resolves a named file inside the session directory with a path-traversal
     * guard. File names ultimately come from URL path segments.
     */
    private Path resolveAsset(Long recordedSessionId, String fileName) {
        if (fileName == null || fileName.isBlank()
                || fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            throw new BadRequestException("Invalid file name");
        }
        Path dir = sessionDir(recordedSessionId);
        Path resolved = dir.resolve(fileName).normalize();
        if (!resolved.startsWith(dir)) {
            throw new BadRequestException("Invalid file name");
        }
        return resolved;
    }

    private String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            throw new BadRequestException("File must have a valid extension");
        }
        return filename.substring(dot + 1).toLowerCase();
    }
}
