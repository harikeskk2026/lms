package com.careerlabs.lms.api.auth.validation;

import com.careerlabs.lms.api.auth.validation.annotation.ValidEmailFormat;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

public class EmailFormatValidator implements ConstraintValidator<ValidEmailFormat, String> {

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            // @NotBlank on the field already reports the "required" case.
            return true;
        }
        return value.equals(value.trim())
                && !value.contains("..")
                && EMAIL_PATTERN.matcher(value).matches();
    }
}
