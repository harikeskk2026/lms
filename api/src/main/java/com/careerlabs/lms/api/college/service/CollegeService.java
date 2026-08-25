package com.careerlabs.lms.api.college.service;

import com.careerlabs.lms.api.college.dto.request.CollegeRequest;
import com.careerlabs.lms.api.college.dto.response.CollegeResponse;

import java.util.List;

public interface CollegeService {

    List<CollegeResponse> list(String search);

    CollegeResponse get(Long id);

    CollegeResponse create(CollegeRequest request);

    CollegeResponse update(Long id, CollegeRequest request);

    void delete(Long id);
}
