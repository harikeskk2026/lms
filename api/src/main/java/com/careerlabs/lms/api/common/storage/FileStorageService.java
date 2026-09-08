package com.careerlabs.lms.api.common.storage;

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
import java.util.UUID;

/**
 * Stores uploaded files on local disk under {@code app.upload.dir}, exposed back
 * to clients at {@code /uploads/**} (see WebConfig). Only PDF/DOCX/XLS/XLSX files
 * are accepted, matching the LMS-wide assignment/submission attachment policy.
 */
@Service
public class FileStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "docx", "doc", "xls", "xlsx", "csv", "txt", "ppt", "pptx",
            "png", "jpg", "jpeg", "webp", "gif", "svg", "mp4", "webm", "zip"
    );
    private static final long MAX_FILE_SIZE_BYTES = 10L * 1024 * 1024;

    private final Path root;

    public FileStorageService(@Value("${app.upload.dir}") String uploadDir) {
        this.root = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    public StoredFile store(MultipartFile file, String subDir) {
        return store(file, subDir, ALLOWED_EXTENSIONS);
    }

    public StoredFile store(MultipartFile file, String subDir, Set<String> allowedExtensions) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("A file is required");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException("File must be 10MB or smaller");
        }

        String originalName = StringUtils.cleanPath(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        String extension = extensionOf(originalName);
        if (!allowedExtensions.contains(extension)) {
            throw new BadRequestException("File type not allowed: ." + extension);
        }

        try {
            Path targetDir = root.resolve(subDir);
            Files.createDirectories(targetDir);

            String storedName = UUID.randomUUID() + "." + extension;
            Path target = targetDir.resolve(storedName).normalize();
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

            return new StoredFile("/uploads/" + subDir + "/" + storedName, originalName);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to store uploaded file", e);
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
