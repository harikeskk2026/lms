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
        if (dbFile.isPresent()) {
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

        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }
}
