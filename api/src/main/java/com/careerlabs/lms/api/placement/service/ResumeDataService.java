package com.careerlabs.lms.api.placement.service;

import com.careerlabs.lms.api.placement.dto.response.ResumeUploadResponse;
import org.springframework.web.multipart.MultipartFile;

public interface ResumeDataService {

    /** Returns the Resume Builder's flat form-state, defaulted when the student hasn't saved one yet. */
    Object get(Long userId);

    Object save(Long userId, Object content);

    ResumeUploadResponse uploadFile(Long userId, MultipartFile file);
}
