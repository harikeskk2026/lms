package com.careerlabs.lms.api.common.util;

import java.util.regex.Pattern;

/**
 * Shared validation helpers used by the bulk CSV import services so every
 * import backend enforces the same email / phone / password rules as the
 * individual create endpoints.
 */
public final class ImportValidators {

    private ImportValidators() {
    }

    // Same pattern used by the student bulk import.
    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9._%+-]+@(?!\\d+(?:\\.\\d+)*\\.[A-Za-z]{2,}$)[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private static final Pattern PHONE_PATTERN =
            Pattern.compile("^[6-9]\\d{9}$");

    public static boolean isValidEmail(String email) {
        if (email == null || email.isBlank() || email.contains("..")) {
            return false;
        }
        return EMAIL_PATTERN.matcher(email).matches();
    }

    public static boolean isValidPhone(String phone) {
        if (phone == null || phone.isEmpty()) {
            return false;
        }
        return PHONE_PATTERN.matcher(phone).matches();
    }

    public static boolean isValidPasswordStrength(String value) {
        if (value == null || value.length() < 8 || value.length() > 128) {
            return false;
        }
        boolean hasUpper = false;
        boolean hasLower = false;
        boolean hasDigit = false;
        boolean hasSpecial = false;
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (Character.isWhitespace(c)) {
                return false;
            }
            if (Character.isUpperCase(c)) {
                hasUpper = true;
            } else if (Character.isLowerCase(c)) {
                hasLower = true;
            } else if (Character.isDigit(c)) {
                hasDigit = true;
            } else {
                hasSpecial = true;
            }
        }
        return hasUpper && hasLower && hasDigit && hasSpecial;
    }
}