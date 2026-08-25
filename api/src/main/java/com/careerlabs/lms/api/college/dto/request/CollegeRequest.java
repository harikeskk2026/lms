package com.careerlabs.lms.api.college.dto.request;

import com.careerlabs.lms.api.college.validation.CollegeValidationMessages;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public class CollegeRequest {

    @NotBlank(message = CollegeValidationMessages.NAME_REQUIRED)
    @Size(min = 2, max = 150, message = CollegeValidationMessages.NAME_SIZE)
    private String name;

    private List<Long> courseIds;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<Long> getCourseIds() {
        return courseIds;
    }

    public void setCourseIds(List<Long> courseIds) {
        this.courseIds = courseIds;
    }
}
