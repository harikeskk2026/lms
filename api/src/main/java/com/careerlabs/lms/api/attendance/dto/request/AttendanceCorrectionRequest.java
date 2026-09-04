package com.careerlabs.lms.api.attendance.dto.request;

import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.attendance.validation.AttendanceValidationMessages;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class AttendanceCorrectionRequest {

    // Exactly one of these three must be set: attendanceId when disputing an existing
    // (wrong) record, dailyClassId when a scheduled DailyClass was never marked for this
    // student, meetingLinkId when only a Scheduled Class (Zoom) session exists with no
    // DailyClass at all yet. AttendanceCorrectionServiceImpl.create() validates that and
    // lazily creates whatever's missing (DailyClass and/or an ABSENT-by-default
    // Attendance row) before filing the request.
    private Long attendanceId;

    private Long dailyClassId;

    private Long meetingLinkId;

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

    public Long getDailyClassId() {
        return dailyClassId;
    }

    public void setDailyClassId(Long dailyClassId) {
        this.dailyClassId = dailyClassId;
    }

    public Long getMeetingLinkId() {
        return meetingLinkId;
    }

    public void setMeetingLinkId(Long meetingLinkId) {
        this.meetingLinkId = meetingLinkId;
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
