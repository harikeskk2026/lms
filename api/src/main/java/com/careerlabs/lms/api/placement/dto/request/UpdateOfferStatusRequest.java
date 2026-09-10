package com.careerlabs.lms.api.placement.dto.request;

import com.careerlabs.lms.api.placement.entity.OfferStatus;
import jakarta.validation.constraints.NotNull;

/** Student action on an offer: ACCEPTED or REJECTED. */
public record UpdateOfferStatusRequest(
        @NotNull OfferStatus status
) {}