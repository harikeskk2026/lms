package com.careerlabs.lms.api.attendance.dto.request;

import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.attendance.validation.AttendanceValidationMessages;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class AttendanceCorrectionRequest {

    @NotNull(message = AttendanceValidationMessages.ATTENDANCE_ID_REQUIRED)
    private Long attendanceId;

    @NotNull(message = AttendanceValidationMessages.REQUESTED_STATUS_REQUIRED)
    private AttendStatus requestedStatus;

    @NotBlank(message = AttendanceValidationMessages.REASON_REQUIRED)
    private String reason;

    private String comment;

    private String documentUrl;

    public Long getAttendanceId() {
        return attendanceId;
    }

    public void setAttendanceId(Long attendanceId) {
        this.attendanceId = attendanceId;
    }

    public AttendStatus getRequestedStatus() {
        return requestedStatus;
    }

    public void setRequestedStatus(AttendStatus requestedStatus) {
        this.requestedStatus = requestedStatus;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public String getDocumentUrl() {
        return documentUrl;
    }

    public void setDocumentUrl(String documentUrl) {
        this.documentUrl = documentUrl;
    }
}
