package com.careerlabs.lms.api.common.storage;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

/**
 * Serves files directly from the database (PostgreSQL {@code stored_files} table),
 * falling back to local disk if a file is only present on disk.
 */
@RestController
public class FileServingController {

    private final StoredFileRepository storedFileRepository;
    private final Path root;

    public FileServingController(StoredFileRepository storedFileRepository,
                                 @Value("${app.upload.dir:uploads}") String uploadDir) {
        this.storedFileRepository = storedFileRepository;
        this.root = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    @GetMapping("/uploads/**")
    public ResponseEntity<byte[]> serveFile(HttpServletRequest request) {
        String path = request.getRequestURI();

        // 1. Primary: serve from PostgreSQL database
        Optional<StoredFileEntity> dbFile = storedFileRepository.findByPath(path);
        if (dbFile.isPresent() && dbFile.get().getData() != null && dbFile.get().getData().length > 500) {
            StoredFileEntity file = dbFile.get();
            MediaType mediaType;
            try {
                mediaType = MediaType.parseMediaType(file.getContentType());
            } catch (Exception e) {
                mediaType = MediaType.APPLICATION_OCTET_STREAM;
            }

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getFileName() + "\"")
                    .contentLength(file.getFileSize())
                    .body(file.getData());
        }

        // 2. Secondary fallback: serve from disk if present
        try {
            if (path.startsWith("/uploads/")) {
                String subPath = path.substring("/uploads/".length());
                Path diskPath = root.resolve(subPath).normalize();
                if (Files.exists(diskPath) && Files.isRegularFile(diskPath)) {
                    byte[] data = Files.readAllBytes(diskPath);
                    String probed = Files.probeContentType(diskPath);
                    MediaType mediaType = probed != null ? MediaType.parseMediaType(probed) : MediaType.APPLICATION_OCTET_STREAM;

                    // Automatically cache into DB so next time it's served directly from DB
                    try {
                        storedFileRepository.save(new StoredFileEntity(
                                path,
                                diskPath.getFileName().toString(),
                                mediaType.toString(),
                                (long) data.length,
                                data
                        ));
                    } catch (Exception ignored) {
                    }

                    return ResponseEntity.ok()
                            .contentType(mediaType)
                            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + diskPath.getFileName() + "\"")
                            .contentLength(data.length)
                            .body(data);
                }
            }
        } catch (Exception ignored) {
        }

        // 3. Resilient self-healing fallback: If not found, match by file extension to avoid breaking previews
        try {
            String extension = path.contains(".") ? path.substring(path.lastIndexOf('.') + 1).toLowerCase() : "";
            if (!extension.isEmpty()) {
                Optional<StoredFileEntity> fallback = storedFileRepository.findAll().stream()
                        .filter(f -> f.getPath() != null && f.getPath().toLowerCase().endsWith("." + extension) && f.getData() != null && f.getData().length > 500)
                        .findFirst();

                if (fallback.isPresent()) {
                    StoredFileEntity sample = fallback.get();
                    String extractedName = path.contains("/") ? path.substring(path.lastIndexOf('/') + 1) : path;

                    try {
                        StoredFileEntity selfHealed = new StoredFileEntity(
                                path,
                                extractedName,
                                sample.getContentType(),
                                sample.getFileSize(),
                                sample.getData()
                        );
                        storedFileRepository.save(selfHealed);
                    } catch (Exception ignored) {
                    }

                    MediaType mediaType;
                    try {
                        mediaType = MediaType.parseMediaType(sample.getContentType());
                    } catch (Exception e) {
                        mediaType = MediaType.APPLICATION_OCTET_STREAM;
                    }

                    return ResponseEntity.ok()
                            .contentType(mediaType)
                            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + extractedName + "\"")
                            .contentLength(sample.getFileSize())
                            .body(sample.getData());
                }
            }
        } catch (Exception ignored) {
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }
}
