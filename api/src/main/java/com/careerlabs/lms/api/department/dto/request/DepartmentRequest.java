package com.careerlabs.lms.api.department.dto.request;

import com.careerlabs.lms.api.department.validation.DepartmentValidationMessages;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class DepartmentRequest {

    @NotBlank(message = DepartmentValidationMessages.NAME_REQUIRED)
    @Size(min = 2, max = 150, message = DepartmentValidationMessages.NAME_SIZE)
    private String name;

    @NotNull(message = DepartmentValidationMessages.COLLEGE_ID_REQUIRED)
    private Long collegeId;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getCollegeId() {
        return collegeId;
    }

    public void setCollegeId(Long collegeId) {
        this.collegeId = collegeId;
    }
}
