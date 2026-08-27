package com.careerlabs.lms.api.syllabus.dto.request;

import com.careerlabs.lms.api.syllabus.validation.SyllabusValidationMessages;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class SyllabusTopicRequest {

    @NotBlank(message = SyllabusValidationMessages.TITLE_REQUIRED)
    @Size(min = 2, max = 200, message = SyllabusValidationMessages.TITLE_SIZE)
    private String title;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}
