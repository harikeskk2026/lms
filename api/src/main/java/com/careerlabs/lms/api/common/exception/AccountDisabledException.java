package com.careerlabs.lms.api.common.exception;

import org.springframework.http.HttpStatus;

public class AccountDisabledException extends ApiException {

    public AccountDisabledException(String message) {
        super(message, HttpStatus.FORBIDDEN);
    }
}
