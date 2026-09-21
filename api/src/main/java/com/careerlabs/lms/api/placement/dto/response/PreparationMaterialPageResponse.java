package com.careerlabs.lms.api.placement.dto.response;

import java.util.List;

public record PreparationMaterialPageResponse(
        List<PreparationMaterialResponse> items,
        long totalElements,
        int totalPages,
        int page
) {}