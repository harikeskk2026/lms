package com.careerlabs.lms.api.common.mail;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@careerlabs.com}")
    private String fromEmail;

    public EmailServiceImpl(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void sendOtpEmail(String toEmail, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Password Reset Verification Code - CareerLabs");

            String htmlContent = """
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f3ff; margin: 0; padding: 30px 15px; }
                        .container { max-width: 500px; margin: 0 auto; }
                        .card { background: #ffffff; border-radius: 16px; padding: 36px; box-shadow: 0 10px 25px -5px rgba(124, 58, 237, 0.12), 0 8px 10px -6px rgba(124, 58, 237, 0.08); border: 1px solid #ede9fe; }
                        .header { text-align: center; margin-bottom: 28px; }
                        .brand { display: inline-block; background: linear-gradient(135deg, #7c3aed 0%%, #6d28d9 100%%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
                        .subtitle { font-size: 13px; color: #8b5cf6; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
                        .title { font-size: 20px; font-weight: 700; color: #4c1d95; margin-bottom: 12px; }
                        .text { font-size: 14px; color: #4c1d95; opacity: 0.85; line-height: 1.6; margin-bottom: 24px; }
                        .otp-container { background: linear-gradient(135deg, #faf5ff 0%%, #f3e8ff 100%%); border: 2px dashed #c084fc; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 24px; }
                        .otp-label { font-size: 11px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
                        .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #5b21b6; font-family: 'Courier New', Courier, monospace; }
                        .badge { display: inline-block; background: #ede9fe; color: #6d28d9; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; margin-top: 10px; }
                        .footer { font-size: 12px; color: #a78bfa; text-align: center; border-top: 1px solid #f3e8ff; padding-top: 20px; margin-top: 28px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="card">
                            <div class="header">
                                <div class="brand">CareerLabs</div>
                                <div class="subtitle">Learning Management System</div>
                            </div>
                            <div class="title">Password Reset OTP</div>
                            <p class="text">We received a request to reset your password. Please use the verification code below to proceed with resetting your password.</p>
                            <div class="otp-container">
                                <div class="otp-label">Your Verification Code</div>
                                <div class="otp-code">%s</div>
                                <div class="badge">Valid for 10 minutes</div>
                            </div>
                            <p class="text">If you didn't initiate this request, you can safely ignore this email.</p>
                            <div class="footer">&copy; CareerLabs LMS. All rights reserved.</div>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(otp);


            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Successfully sent OTP email to {}", toEmail);
        } catch (MessagingException e) {
            log.error("Failed to send OTP email to {}", toEmail, e);
            throw new RuntimeException("Failed to send email", e);
        }
    }
}
