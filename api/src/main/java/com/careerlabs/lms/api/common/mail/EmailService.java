package com.careerlabs.lms.api.common.mail;

public interface EmailService {
    void sendOtpEmail(String toEmail, String otp);
}
