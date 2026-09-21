package com.careerlabs.lms.api.placement.service;

import com.careerlabs.lms.api.placement.dto.request.CreateOfferRequest;
import com.careerlabs.lms.api.placement.dto.response.OfferPageResponse;
import com.careerlabs.lms.api.placement.dto.response.OfferResponse;

import java.util.List;

public interface OfferService {

    OfferResponse issueOffer(CreateOfferRequest request, Long adminUserId);

    OfferResponse acceptOffer(Long offerId, Long studentUserId);

    OfferResponse rejectOffer(Long offerId, Long studentUserId);

    OfferResponse withdrawOffer(Long offerId, Long adminUserId);

    List<OfferResponse> listForStudent(Long studentUserId);

    OfferPageResponse pageForStudent(Long studentUserId, String search, int page, int limit);

    List<OfferResponse> listForDrive(Long driveId);

    List<OfferResponse> listAll();

    OfferPageResponse pageForAdmin(Long driveId, String search, String status, int page, int limit);
}