package com.careerlabs.lms.api.auth.validation;

import com.careerlabs.lms.api.auth.validation.annotation.ValidPhoneNumber;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

public class PhoneNumberFormatValidator implements ConstraintValidator<ValidPhoneNumber, String> {

    private static final Pattern PHONE_PATTERN = Pattern.compile("^[6-9]\\d{9}$");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            // @NotBlank on the field already reports the "required" case.
            return true;
        }
        return PHONE_PATTERN.matcher(value).matches();
    }
}
