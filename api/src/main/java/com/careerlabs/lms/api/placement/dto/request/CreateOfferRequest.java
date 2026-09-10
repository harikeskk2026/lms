package com.careerlabs.lms.api.placement.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/** Payload for issuing an offer on an application. */
public record CreateOfferRequest(
        @NotNull Long applicationId,
        @NotBlank String role,
        String ctc,
        LocalDate joiningDate,
        LocalDate offerExpiry,
        String offerLetterUrl
) {}