package com.careerlabs.lms.api.syllabus.importer;

import org.springframework.web.multipart.MultipartFile;

public interface SyllabusImportService {

    SyllabusImportPreviewResponse preview(Long courseId, MultipartFile file);

    SyllabusImportResponse importSyllabus(Long courseId, MultipartFile file);
}
