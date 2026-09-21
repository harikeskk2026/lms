package com.careerlabs.lms.api.placement.dto.response;

import java.util.List;

public record OfferPageResponse(
        List<OfferResponse> items,
        long totalElements,
        int totalPages,
        int page
) {}