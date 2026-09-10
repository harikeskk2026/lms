package com.careerlabs.lms.api.placement.controller;

import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.placement.dto.response.OfferResponse;
import com.careerlabs.lms.api.placement.service.OfferService;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Student view of and actions on their placement offers. */
@RestController
@RequestMapping("/api/student/offers")
public class StudentOfferController {

    private final OfferService offerService;

    public StudentOfferController(OfferService offerService) {
        this.offerService = offerService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<OfferResponse>>> myOffers(@AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(offerService.listForStudent(principal.id())));
    }

    @PostMapping("/{offerId}/accept")
    public ResponseEntity<ApiResponse<OfferResponse>> accept(@PathVariable Long offerId,
                                                             @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of("Offer accepted", offerService.acceptOffer(offerId, principal.id())));
    }

    @PostMapping("/{offerId}/reject")
    public ResponseEntity<ApiResponse<OfferResponse>> reject(@PathVariable Long offerId,
                                                             @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of("Offer declined", offerService.rejectOffer(offerId, principal.id())));
    }
}