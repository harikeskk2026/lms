package com.careerlabs.lms.api.placement.service;

import com.careerlabs.lms.api.placement.dto.request.CreatePlacementRequest;
import com.careerlabs.lms.api.placement.dto.response.PlacementResponse;
import com.careerlabs.lms.api.placement.entity.Offer;

import java.util.List;

public interface PlacementService {

    PlacementResponse getForStudent(Long studentUserId);

    List<PlacementResponse> listAll();

    PlacementResponse record(CreatePlacementRequest request, Long adminUserId);

    /**
     * Create the final Placement record from an accepted offer (single source
     * of truth for the drive-based flow).
     */
    PlacementResponse createFromOffer(Offer offer, Long adminUserId);
}