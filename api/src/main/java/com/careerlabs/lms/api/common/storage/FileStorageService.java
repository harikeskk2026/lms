package com.careerlabs.lms.api.common.storage;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.UUID;

/**
 * Stores uploaded files directly in the database (PostgreSQL bytea) via
 * {@link StoredFileRepository}, with optional local disk caching. Files are
 * served back to clients at {@code /uploads/**} by {@link FileServingController}.
 */
@Service
public class FileStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "docx", "doc", "xls", "xlsx", "csv", "txt", "ppt", "pptx",
            "png", "jpg", "jpeg", "webp", "gif", "svg", "mp4", "webm", "zip"
    );
    private static final long MAX_FILE_SIZE_BYTES = 10L * 1024 * 1024;

    private final Path root;
    private final StoredFileRepository storedFileRepository;

    public FileStorageService(@Value("${app.upload.dir:uploads}") String uploadDir,
                             StoredFileRepository storedFileRepository) {
        this.root = Path.of(uploadDir).toAbsolutePath().normalize();
        this.storedFileRepository = storedFileRepository;
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
            String storedName = UUID.randomUUID() + "." + extension;
            String url = "/uploads/" + subDir + "/" + storedName;
            byte[] data = file.getBytes();
            String contentType = resolveContentType(file, extension);

            // Persist file binary data directly into the database
            StoredFileEntity entity = new StoredFileEntity(url, originalName, contentType, file.getSize(), data);
            storedFileRepository.save(entity);

            // Optional secondary disk cache
            try {
                Path targetDir = root.resolve(subDir);
                Files.createDirectories(targetDir);
                Path target = targetDir.resolve(storedName).normalize();
                Files.write(target, data);
            } catch (Exception ignored) {
                // Non-fatal if disk write fails because DB has the complete file
            }

            return new StoredFile(url, originalName);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to store uploaded file", e);
        }
    }

    private String resolveContentType(MultipartFile file, String extension) {
        String ct = file.getContentType();
        if (StringUtils.hasText(ct) && !MediaType.APPLICATION_OCTET_STREAM_VALUE.equals(ct)) {
            return ct;
        }
        return switch (extension.toLowerCase()) {
            case "pdf" -> "application/pdf";
            case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "doc" -> "application/msword";
            case "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "xls" -> "application/vnd.ms-excel";
            case "csv" -> "text/csv";
            case "txt" -> "text/plain";
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "webp" -> "image/webp";
            case "gif" -> "image/gif";
            case "svg" -> "image/svg+xml";
            case "mp4" -> "video/mp4";
            case "webm" -> "video/webm";
            case "zip" -> "application/zip";
            default -> "application/octet-stream";
        };
    }

    private String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            throw new BadRequestException("File must have a valid extension");
        }
        return filename.substring(dot + 1).toLowerCase();
    }

    /**
     * Reads a previously stored file back from disk for access-controlled serving.
     * The stored URL is opaque ({@code /uploads/&lt;subDir&gt;/&lt;uuid&gt;.&lt;ext&gt;}), so only
     * callers that already hold a reference to it (and have passed their own
     * authorization layer) can resolve the underlying bytes.
     */
    public LoadedFile load(String storedUrl) {
        if (storedUrl == null || storedUrl.isBlank() || !storedUrl.startsWith("/uploads/")) {
            throw new BadRequestException("Invalid file reference");
        }
        String relative = storedUrl.substring("/uploads/".length());
        Path target = root.resolve(relative).normalize();
        if (!target.startsWith(root)) {
            throw new BadRequestException("Invalid file reference");
        }
        try {
            if (!Files.exists(target)) {
                throw new ResourceNotFoundException("File not found on server");
            }
            return new LoadedFile(Files.readAllBytes(target), contentTypeFor(relative));
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read stored file", e);
        }
    }

    private String contentTypeFor(String filename) {
        String ext = extensionOf(filename);
        return switch (ext) {
            case "pdf" -> "application/pdf";
            case "doc" -> "application/msword";
            case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            default -> "application/octet-stream";
        };
    }
}
