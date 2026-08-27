package com.careerlabs.lms.api.session.service;

import com.careerlabs.lms.api.session.dto.request.ReorderRequest;
import com.careerlabs.lms.api.session.dto.request.SessionRequest;
import com.careerlabs.lms.api.session.dto.response.SessionResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;

import java.util.List;

public interface SessionService {

    List<SessionResponse> list(Long topicId, JwtUserPrincipal principal);

    SessionResponse create(Long topicId, SessionRequest request);

    SessionResponse update(Long id, SessionRequest request);

    void delete(Long id);

    List<SessionResponse> reorder(Long topicId, ReorderRequest request);
}
