package com.careerlabs.lms.api.assignment.dto.request;

import com.careerlabs.lms.api.assignment.entity.AssignmentStatus;
import com.careerlabs.lms.api.assignment.validation.AssignmentValidationMessages;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

public class AssignmentRequest {

    @NotBlank(message = AssignmentValidationMessages.TITLE_REQUIRED)
    @Size(min = 3, max = 150, message = AssignmentValidationMessages.TITLE_SIZE)
    private String title;

    @NotBlank(message = AssignmentValidationMessages.DESCRIPTION_REQUIRED)
    private String description;

    @NotNull(message = AssignmentValidationMessages.COURSE_ID_REQUIRED)
    private Long courseId;

    @NotNull(message = AssignmentValidationMessages.BATCH_ID_REQUIRED)
    private Long batchId;

    private LocalDate startDate;

    private LocalTime publishTime;

    @NotNull(message = AssignmentValidationMessages.DUE_DATE_REQUIRED)
    private LocalDate dueDate;

    private LocalTime closeTime;

    @NotNull(message = AssignmentValidationMessages.TOTAL_MARKS_REQUIRED)
    @Min(value = 1, message = AssignmentValidationMessages.TOTAL_MARKS_MIN)
    @Max(value = 100, message = AssignmentValidationMessages.TOTAL_MARKS_MAX)
    private Integer totalMarks;

    private String attachmentUrl;

    private String attachmentName;

    private AssignmentStatus status;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public Long getBatchId() {
        return batchId;
    }

    public void setBatchId(Long batchId) {
        this.batchId = batchId;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalTime getPublishTime() {
        return publishTime;
    }

    public void setPublishTime(LocalTime publishTime) {
        this.publishTime = publishTime;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public LocalTime getCloseTime() {
        return closeTime;
    }

    public void setCloseTime(LocalTime closeTime) {
        this.closeTime = closeTime;
    }

    public Integer getTotalMarks() {
        return totalMarks;
    }

    public void setTotalMarks(Integer totalMarks) {
        this.totalMarks = totalMarks;
    }

    public String getAttachmentUrl() {
        return attachmentUrl;
    }

    public void setAttachmentUrl(String attachmentUrl) {
        this.attachmentUrl = attachmentUrl;
    }

    public String getAttachmentName() {
        return attachmentName;
    }

    public void setAttachmentName(String attachmentName) {
        this.attachmentName = attachmentName;
    }

    public AssignmentStatus getStatus() {
        return status;
    }

    public void setStatus(AssignmentStatus status) {
        this.status = status;
    }
}
