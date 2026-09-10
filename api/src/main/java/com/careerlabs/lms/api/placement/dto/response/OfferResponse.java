package com.careerlabs.lms.api.placement.dto.response;

import com.careerlabs.lms.api.placement.entity.Offer;
import com.careerlabs.lms.api.placement.entity.OfferStatus;

import java.time.Instant;
import java.time.LocalDate;

/** Student-facing view of an offer they received. */
public record OfferResponse(
        Long id,
        String offerNumber,
        String companyName,
        String role,
        String ctc,
        LocalDate offerDate,
        LocalDate offerExpiry,
        LocalDate joiningDate,
        String offerLetterUrl,
        OfferStatus status,
        Instant acceptedAt,
        Long driveId,
        Long applicationId,
        Long studentId,
        String studentName
) {

    public static OfferResponse from(Offer offer) {
        return new OfferResponse(
                offer.getId(),
                offer.getOfferNumber(),
                offer.getDrive().getCompanyName(),
                offer.getRole(),
                offer.getCtc(),
                offer.getOfferDate(),
                offer.getOfferExpiry(),
                offer.getJoiningDate(),
                offer.getOfferLetterUrl(),
                offer.getStatus(),
                offer.getAcceptedAt(),
                offer.getDrive().getId(),
                offer.getApplication().getId(),
                offer.getApplication().getStudent().getId(),
                offer.getApplication().getStudent().getUser().getName());
    }
}