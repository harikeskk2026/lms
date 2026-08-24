const nodemailer = require('nodemailer')
const logger = require('./logger')

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.zoho.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

async function sendEmail({ to, subject, html }) {
  if (process.env.NODE_ENV === 'development') {
    logger.info(`[DEV] Email to ${to} | Subject: ${subject}`)
    // In dev, log OTP if present in html (extracted from data attribute or just log intent)
    logger.info(`[DEV] Email HTML preview omitted. Check OTP in service logs.`)
    return { messageId: 'dev-mode-skipped' }
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'CareerLabs LMS <noreply@careerlabs.in>',
      to,
      subject,
      html
    })
    logger.info(`Email sent to ${to}: ${info.messageId}`)
    return info
  } catch (err) {
    logger.error(`Failed to send email to ${to}:`, err.message)
    // Don't throw — email failure should not break auth flow
    return null
  }
}

function forgotPasswordEmail(name, otp) {
  return {
    subject: 'Your CareerLabs OTP for Password Reset',
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Password Reset OTP</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(109,40,217,0.10);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6d28d9 0%,#4c1d95 100%);padding:36px 40px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-1px;">
              Career<span style="color:#ffd668;">Labs</span>
            </div>
            <div style="color:#c4b5fd;font-size:13px;margin-top:4px;">Learning Management System</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="font-size:18px;font-weight:600;color:#1e1b4b;margin:0 0 8px;">Hi ${name},</p>
            <p style="font-size:15px;color:#6b7280;margin:0 0 32px;line-height:1.6;">
              We received a request to reset your password. Use the OTP below to proceed.
            </p>

            <!-- OTP Box -->
            <div style="background:#f5f3ff;border:2px dashed #6d28d9;border-radius:12px;padding:28px;text-align:center;margin:0 0 32px;">
              <div style="font-size:11px;font-weight:600;color:#6d28d9;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">Your OTP Code</div>
              <div style="font-size:48px;font-weight:800;color:#4c1d95;letter-spacing:12px;font-family:'Courier New',monospace;">${otp}</div>
              <div style="font-size:13px;color:#9ca3af;margin-top:12px;">Valid for <strong>10 minutes</strong></div>
            </div>

            <p style="font-size:13px;color:#9ca3af;line-height:1.7;margin:0 0 8px;">
              If you didn't request a password reset, please ignore this email or contact support immediately.
            </p>
            <p style="font-size:13px;color:#9ca3af;margin:0;">
              For security, never share this OTP with anyone.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">
              &copy; ${new Date().getFullYear()} CareerLabs — Madurai. All rights reserved.<br/>
              This is an automated email. Please do not reply.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  }
}

function welcomeEmail(name, email, tempPassword) {
  return {
    subject: 'Welcome to CareerLabs LMS — Your Account is Ready',
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to CareerLabs</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(109,40,217,0.10);">
        <tr>
          <td style="background:linear-gradient(135deg,#6d28d9 0%,#4c1d95 100%);padding:36px 40px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-1px;">
              Career<span style="color:#ffd668;">Labs</span>
            </div>
            <div style="color:#c4b5fd;font-size:13px;margin-top:4px;">Learning Management System</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="font-size:22px;font-weight:700;color:#1e1b4b;margin:0 0 8px;">Welcome, ${name}! 🎉</p>
            <p style="font-size:15px;color:#6b7280;margin:0 0 32px;line-height:1.6;">
              Your CareerLabs LMS account has been created. Here are your login credentials:
            </p>

            <div style="background:#f5f3ff;border-radius:12px;padding:24px;margin:0 0 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#6b7280;width:40%;">Email</td>
                  <td style="padding:8px 0;font-size:14px;color:#1e1b4b;font-weight:600;">${email}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#6b7280;">Temp Password</td>
                  <td style="padding:8px 0;font-size:14px;color:#1e1b4b;font-weight:600;font-family:'Courier New',monospace;">${tempPassword}</td>
                </tr>
              </table>
            </div>

            <div style="text-align:center;margin:0 0 24px;">
              <a href="${process.env.CLIENT_URL}/login" style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#4c1d95);color:#ffffff;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;text-decoration:none;">
                Login to CareerLabs →
              </a>
            </div>

            <p style="font-size:13px;color:#9ca3af;text-align:center;">
              Please change your password after first login.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">
              &copy; ${new Date().getFullYear()} CareerLabs — Madurai. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  }
}

module.exports = { sendEmail, forgotPasswordEmail, welcomeEmail }
