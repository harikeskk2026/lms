package com.careerlabs.lms.api.assignment.dto.response;

import com.careerlabs.lms.api.submission.dto.response.SubmissionAttachmentResponse;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record StudentAssignmentResponse(
        Long id,
        String title,
        String description,
        String batchName,
        LocalDate startDate,
        LocalTime publishTime,
        LocalDate dueDate,
        LocalTime closeTime,
        int maxMarks,
        String attachmentUrl,
        String attachmentName,
        boolean isOverdue,
        SubmissionInfo submission,
        List<AssignmentAttachmentResponse> attachments
) {

    public StudentAssignmentResponse(
            Long id,
            String title,
            String description,
            String batchName,
            LocalDate startDate,
            LocalTime publishTime,
            LocalDate dueDate,
            LocalTime closeTime,
            int maxMarks,
            String attachmentUrl,
            String attachmentName,
            boolean isOverdue,
            SubmissionInfo submission
    ) {
        this(id, title, description, batchName, startDate, publishTime, dueDate, closeTime, maxMarks,
                attachmentUrl, attachmentName, isOverdue, submission,
                attachmentUrl != null ? List.of(new AssignmentAttachmentResponse(attachmentUrl, attachmentName)) : List.of());
    }

    public record SubmissionInfo(
            Long id,
            String status,
            Integer grade,
            String feedback,
            String fileUrl,
            String fileName,
            String notes,
            Instant submittedAt,
            Instant gradedAt,
            List<SubmissionAttachmentResponse> files,
            String rejectionReason
    ) {
        public SubmissionInfo(
                Long id,
                String status,
                Integer grade,
                String feedback,
                String fileUrl,
                String fileName,
                String notes,
                Instant submittedAt,
                Instant gradedAt,
                List<SubmissionAttachmentResponse> files
        ) {
            this(id, status, grade, feedback, fileUrl, fileName, notes, submittedAt, gradedAt, files, null);
        }

        public SubmissionInfo(
                Long id,
                String status,
                Integer grade,
                String feedback,
                String fileUrl,
                String notes,
                Instant submittedAt,
                Instant gradedAt
        ) {
            this(id, status, grade, feedback, fileUrl, null, notes, submittedAt, gradedAt, List.of(), null);
        }
    }
}
