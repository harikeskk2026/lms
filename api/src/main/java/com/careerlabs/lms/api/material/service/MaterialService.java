package com.careerlabs.lms.api.material.service;

import com.careerlabs.lms.api.material.dto.request.MaterialRequest;
import com.careerlabs.lms.api.material.dto.response.MaterialResponse;
import com.careerlabs.lms.api.material.dto.response.UploadResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.common.dto.request.ReorderRequest;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface MaterialService {

    List<MaterialResponse> list(Long courseId, Long moduleId, Long topicId, Long sessionId, JwtUserPrincipal principal);

    List<MaterialResponse> listAllForCourse(Long courseId, JwtUserPrincipal principal);

    MaterialResponse create(MaterialRequest request);

    MaterialResponse update(Long id, MaterialRequest request);

    void delete(Long id);

    List<MaterialResponse> reorder(ReorderRequest request);

    UploadResponse upload(MultipartFile file);

    UploadResponse upload(MultipartFile file, String type);
}
