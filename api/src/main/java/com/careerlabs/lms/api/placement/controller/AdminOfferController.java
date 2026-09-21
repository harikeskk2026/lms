package com.careerlabs.lms.api.placement.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.placement.dto.request.CreateOfferRequest;
import com.careerlabs.lms.api.placement.dto.response.OfferPageResponse;
import com.careerlabs.lms.api.placement.dto.response.OfferResponse;
import com.careerlabs.lms.api.placement.service.OfferService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Admin management of placement offers. */
@RestController
@RequestMapping("/api/admin/offers")
public class AdminOfferController {

    private final OfferService offerService;

    public AdminOfferController(OfferService offerService) {
        this.offerService = offerService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<OfferPageResponse>> list(
            @RequestParam(required = false) Long driveId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(ApiResponse.of(offerService.pageForAdmin(driveId, search, status, page, limit)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OfferResponse>> issue(
            @Valid @RequestBody CreateOfferRequest request,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of("Offer issued", offerService.issueOffer(request, principal.id())));
    }

    @DeleteMapping("/{offerId}")
    public ResponseEntity<ApiResponse<OfferResponse>> withdraw(
            @PathVariable Long offerId,
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of("Offer withdrawn", offerService.withdrawOffer(offerId, principal.id())));
    }
}