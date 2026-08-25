package com.careerlabs.lms.api.department.dto.request;

import com.careerlabs.lms.api.department.validation.DepartmentValidationMessages;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class DepartmentRequest {

    @NotBlank(message = DepartmentValidationMessages.NAME_REQUIRED)
    @Size(min = 2, max = 150, message = DepartmentValidationMessages.NAME_SIZE)
    private String name;

    @NotNull(message = DepartmentValidationMessages.COURSE_ID_REQUIRED)
    private Long courseId;

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
}
