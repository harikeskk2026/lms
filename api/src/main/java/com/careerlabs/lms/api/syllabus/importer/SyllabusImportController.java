package com.careerlabs.lms.api.syllabus.importer;

import com.careerlabs.lms.api.common.response.ApiResponse;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class SyllabusImportController {

    private final SyllabusImportService importService;

    public SyllabusImportController(SyllabusImportService importService) {
        this.importService = importService;
    }

    @PostMapping(value = "/api/courses/{courseId}/modules/import/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<SyllabusImportPreviewResponse>> preview(
            @PathVariable Long courseId,
            @RequestParam("file") MultipartFile file) {
        SyllabusImportPreviewResponse preview = importService.preview(courseId, file);
        return ResponseEntity.ok(ApiResponse.of(preview));
    }

    @PostMapping(value = "/api/courses/{courseId}/modules/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<SyllabusImportResponse>> importSyllabus(
            @PathVariable Long courseId,
            @RequestParam("file") MultipartFile file) {
        SyllabusImportResponse result = importService.importSyllabus(courseId, file);
        return ResponseEntity.status(201).body(ApiResponse.of("Syllabus imported successfully", result));
    }

    @GetMapping(value = "/api/courses/{courseId}/modules/import/template", produces = "application/octet-stream")
    public ResponseEntity<byte[]> downloadTemplate(@PathVariable Long courseId,
                                                   @RequestParam(value = "format", defaultValue = "xlsx") String format) {
        SyllabusTemplateGenerator generator = new SyllabusTemplateGenerator();
        byte[] data;
        String filename;
        String contentType;
        if ("csv".equalsIgnoreCase(format)) {
            data = generator.generateCsvTemplate();
            filename = "syllabus_template.csv";
            contentType = "text/csv";
        } else {
            data = generator.generateExcelTemplate();
            filename = "syllabus_template.xlsx";
            contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        }
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(data);
    }
}
