package com.careerlabs.lms.api.recordedsession.service;

import com.careerlabs.lms.api.recordedsession.dto.request.CreateRecordedSessionRequest;
import com.careerlabs.lms.api.recordedsession.dto.request.UpdateRecordedSessionRequest;
import com.careerlabs.lms.api.recordedsession.dto.response.ProcessingStatusResponse;
import com.careerlabs.lms.api.recordedsession.dto.response.RecordedSessionAnalyticsResponse;
import com.careerlabs.lms.api.recordedsession.dto.response.RecordedSessionResponse;
import com.careerlabs.lms.api.recordedsession.dto.response.StudentRecordedSessionResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface RecordedSessionService {

    List<RecordedSessionResponse> list();

    RecordedSessionResponse get(Long id);

    RecordedSessionResponse create(CreateRecordedSessionRequest request, Long createdBy);

    RecordedSessionResponse update(Long id, UpdateRecordedSessionRequest request);

    void delete(Long id);

    void uploadVideo(Long id, MultipartFile file);

    ProcessingStatusResponse getProcessingStatus(Long id);

    RecordedSessionResponse publish(Long id);

    RecordedSessionResponse archive(Long id);

    RecordedSessionAnalyticsResponse getAnalytics(Long id);

    List<StudentRecordedSessionResponse> listForStudent(Long studentUserId);

    StudentRecordedSessionResponse getForStudent(Long id, Long studentUserId);
}
