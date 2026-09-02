package com.careerlabs.lms.api.auth.validation;

import com.careerlabs.lms.api.auth.validation.annotation.ValidUrl;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

public class UrlFormatValidator implements ConstraintValidator<ValidUrl, String> {

    private static final Pattern URL_PATTERN =
            Pattern.compile("^(https?://)?([\\w-]+\\.)+[a-zA-Z]{2,}(/\\S*)?$");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            // @NotBlank on the field already reports the "required" case.
            return true;
        }
        return URL_PATTERN.matcher(value.trim()).matches();
    }
}
