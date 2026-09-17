package com.careerlabs.lms.api.batch.dto.request;

import com.careerlabs.lms.api.batch.entity.BatchMode;
import com.careerlabs.lms.api.batch.validation.BatchValidationMessages;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public class BatchRequest {

    @NotBlank(message = BatchValidationMessages.NAME_REQUIRED)
    private String name;

    @NotNull(message = BatchValidationMessages.COURSE_ID_REQUIRED)
    private Long courseId;

    private List<Long> trainerIds;

    @NotNull(message = BatchValidationMessages.START_DATE_REQUIRED)
    private LocalDate startDate;

    @NotNull(message = BatchValidationMessages.END_DATE_REQUIRED)
    private LocalDate endDate;

    private String timing;

    @NotNull(message = BatchValidationMessages.MODE_REQUIRED)
    private BatchMode mode;

    @Min(value = 1, message = BatchValidationMessages.MAX_STUDENTS_MIN)
    @Max(value = 500, message = BatchValidationMessages.MAX_STUDENTS_MAX)
    private int maxStudents = 30;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public List<Long> getTrainerIds() {
        return trainerIds;
    }

    public void setTrainerIds(List<Long> trainerIds) {
        this.trainerIds = trainerIds;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public String getTiming() {
        return timing;
    }

    public void setTiming(String timing) {
        this.timing = timing;
    }

    public BatchMode getMode() {
        return mode;
    }

    public void setMode(BatchMode mode) {
        this.mode = mode;
    }

    public int getMaxStudents() {
        return maxStudents;
    }

    public void setMaxStudents(int maxStudents) {
        this.maxStudents = maxStudents;
    }
}
