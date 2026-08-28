package com.careerlabs.lms.api.recordedsession.service;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Set;

/**
 * Stores recorded-session video source files and their transcoded HLS output
 * under {@code app.secure-video.dir} — a directory that must NEVER be
 * registered as a static resource handler or {@code permitAll()} route (see
 * WebConfig/SecurityConfig). Every read goes through an authenticated,
 * authorized controller endpoint instead of the filesystem being reachable
 * directly, which is the entire point of this module.
 */
@Service
public class SecureVideoStorageService {

    private static final Set<String> ALLOWED_VIDEO_EXTENSIONS = Set.of("mp4", "mov", "mkv", "avi", "webm", "m4v");

    private final Path root;

    public SecureVideoStorageService(@Value("${app.secure-video.dir}") String secureVideoDir) {
        this.root = Path.of(secureVideoDir).toAbsolutePath().normalize();
    }

    public Path sessionDir(Long recordedSessionId) {
        Path dir = root.resolve(String.valueOf(recordedSessionId)).normalize();
        if (!dir.startsWith(root)) {
            throw new BadRequestException("Invalid session directory");
        }
        return dir;
    }

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
     * Resolves a file previously produced inside a session's own HLS output
     * directory. Rejects anything that would resolve outside that directory —
     * segment/key file names ultimately come from a URL path segment, so this
     * is the path-traversal guard for the whole streaming path.
     */
    public Path resolveAssetFile(Long recordedSessionId, String storageDir, String fileName) {
        if (fileName == null || fileName.isBlank() || fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            throw new BadRequestException("Invalid file name");
        }
        Path dir = Path.of(storageDir).toAbsolutePath().normalize();
        if (!dir.startsWith(root) || !dir.equals(sessionDir(recordedSessionId))) {
            throw new BadRequestException("Invalid asset directory");
        }
        Path resolved = dir.resolve(fileName).normalize();
        if (!resolved.startsWith(dir)) {
            throw new BadRequestException("Invalid file name");
        }
        return resolved;
    }

    public void deleteSessionDir(Long recordedSessionId) {
        Path dir = sessionDir(recordedSessionId);
        if (!Files.exists(dir)) {
            return;
        }
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

    private String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            throw new BadRequestException("File must have a valid extension");
        }
        return filename.substring(dot + 1).toLowerCase();
    }
}
