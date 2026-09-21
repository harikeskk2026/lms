package com.careerlabs.lms.api.placement.service;

import com.careerlabs.lms.api.placement.dto.request.CreatePreparationMaterialRequest;
import com.careerlabs.lms.api.placement.dto.request.PreparationQuestionRequest;
import com.careerlabs.lms.api.placement.dto.request.UpdatePreparationMaterialRequest;
import com.careerlabs.lms.api.placement.dto.response.PreparationMaterialDetailResponse;
import com.careerlabs.lms.api.placement.dto.response.PreparationMaterialPageResponse;
import com.careerlabs.lms.api.placement.dto.response.PreparationMaterialResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface PreparationMaterialService {

    List<PreparationMaterialResponse> listForAdmin();

    PreparationMaterialPageResponse pageForAdmin(String search, String status, int page, int limit);

    PreparationMaterialResponse getForAdmin(Long id);

    PreparationMaterialDetailResponse getForAdminDetail(Long id);

    PreparationMaterialResponse create(CreatePreparationMaterialRequest request, Long principalUserId);

    PreparationMaterialResponse update(Long id, UpdatePreparationMaterialRequest request);

    void delete(Long id);

    PreparationMaterialResponse publish(Long id, Long principalUserId);

    PreparationMaterialResponse archive(Long id);

    PreparationMaterialResponse uploadDocument(Long materialId, MultipartFile file);

    void deleteDocument(Long materialId, Long documentId);

    PreparationMaterialDetailResponse setQuestions(Long materialId, List<PreparationQuestionRequest> questions);

    List<PreparationMaterialResponse> listForStudent(Long studentId);

    PreparationMaterialPageResponse pageForStudent(Long studentId, String search, int page, int limit);

    PreparationMaterialDetailResponse getForStudent(Long materialId, Long studentId);

    DocumentDownload downloadDocument(Long materialId, Long documentId, Long studentId);
}