package com.careerlabs.lms.api.attendance.service;

import com.careerlabs.lms.api.attendance.dto.request.AttendanceCorrectionRequest;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceCorrectionResponse;
import com.careerlabs.lms.api.attendance.entity.CorrectionStatus;

import java.util.List;

public interface AttendanceCorrectionService {

    AttendanceCorrectionResponse create(Long userId, AttendanceCorrectionRequest request);

    List<AttendanceCorrectionResponse> listForStudent(Long userId);

    List<AttendanceCorrectionResponse> listForAdmin(CorrectionStatus status);

    AttendanceCorrectionResponse review(Long correctionId, Long reviewerUserId, CorrectionStatus decision, String comment);
}
