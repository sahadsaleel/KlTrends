import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';

export interface SendOtpEmailOptions {
  to: string;
  otp: string;
  purpose: 'login' | 'register' | 'forgot-password' | 'reset-password' | string;
  role: 'admin' | 'employee' | 'manager' | string;
  name?: string;
}

export interface SendOtpResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

let transporter: nodemailer.Transporter | null = null;

export const resetTransporter = (): void => {
  if (transporter) {
    try {
      transporter.close();
    } catch {
      // ignore
    }
  }
  transporter = null;
};

export const getTransporter = (): nodemailer.Transporter | null => {
  const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER?.trim().replace(/["']/g, '');
  // Strip all whitespace and surrounding quotes from app passwords (e.g. "ibpw wqwu xonh wiwf" -> "ibpwwqwuxonhwiwf")
  const pass = process.env.SMTP_PASS?.trim().replace(/["'\s]/g, '');

  if (!user || !pass) {
    return null;
  }

  if (!transporter) {
    const smtpOptions = {
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      // Force IPv4 in containerized environments (Railway/Docker) to prevent IPv6 DNS hangs
      family: 4,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    } as SMTPTransport.Options;
    transporter = nodemailer.createTransport(smtpOptions);
  }
  return transporter;
};

/**
 * Diagnostic helper to verify SMTP credentials and server connectivity.
 */
export const verifySmtpConnection = async (): Promise<{
  configured: boolean;
  connected: boolean;
  host: string;
  port: number;
  user: string;
  error?: string;
}> => {
  const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER?.trim().replace(/["']/g, '') || '';
  const pass = process.env.SMTP_PASS?.trim().replace(/["'\s]/g, '') || '';

  if (!user || !pass) {
    return {
      configured: false,
      connected: false,
      host,
      port,
      user: user ? `${user.slice(0, 3)}***` : '(not set)',
      error: 'SMTP_USER or SMTP_PASS is missing in environment variables',
    };
  }

  try {
    // Test on a fresh, non-cached transporter
    const testOptions = {
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      auth: { user, pass },
      family: 4,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    } as SMTPTransport.Options;
    const testTransporter = nodemailer.createTransport(testOptions);

    await testTransporter.verify();
    return {
      configured: true,
      connected: true,
      host,
      port,
      user: `${user.slice(0, 3)}***@${user.split('@')[1] || ''}`,
    };
  } catch (error: any) {
    return {
      configured: true,
      connected: false,
      host,
      port,
      user: `${user.slice(0, 3)}***@${user.split('@')[1] || ''}`,
      error: error?.message || String(error),
    };
  }
};

/**
 * Send an OTP Email to the user with Inbox-optimized headers, plain-text fallback, and anti-spam formatting.
 */
export const sendOtpEmail = async ({
  to,
  otp,
  purpose,
  role,
  name,
}: SendOtpEmailOptions): Promise<SendOtpResult> => {
  // Always log OTP to server console with prominent delimiter for Railway audit logs and quick troubleshooting
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`[OTP Delivery] 🔑 OTP for ${to} (${role} - ${purpose}): [ ${otp} ]`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const isRegister = purpose === 'register';
  const isReset = purpose === 'forgot-password' || purpose === 'reset-password';
  const roleTitle = role === 'admin' ? 'Administrator' : 'Employee';
  
  let actionTitle = 'Account Verification';
  if (isRegister) actionTitle = 'Account Registration';
  else if (isReset) actionTitle = 'Password Reset';
  else if (purpose === 'login') actionTitle = 'Account Login';

  const greeting = name ? `Hello ${name},` : 'Hello,';
  const currentYear = new Date().getFullYear();

  // Plain-text alternative (CRITICAL for Inbox delivery and passing SpamAssassin/Gmail spam filters)
  const plainTextContent = `${greeting}

Your verification code for KL Trends ${actionTitle.toLowerCase()} is: ${otp}

This code is valid for 10 minutes. Please enter it in the application to complete verification.

Security Notice:
Do not share this code with anyone. KL Trends will never ask for your code outside the official application. If you did not request this verification, please disregard this email.

—
KL Trends Management Team
${currentYear} KL Trends. All rights reserved.`;

  // HTML Content with clean inline styles and responsive table structure
  const htmlContent = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KL Trends Verification Code</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f5f7; padding: 24px 12px;">
      <tr>
        <td align="center">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <!-- Header -->
            <tr>
              <td align="center" style="background-color: #570490; padding: 28px 24px; color: #ffffff;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff;">KL TRENDS</h1>
                <p style="margin: 6px 0 0 0; font-size: 13px; color: #e9d5ff;">${roleTitle} Portal &bull; ${actionTitle}</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding: 28px 24px; color: #1e293b;">
                <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #0f172a;">${greeting}</p>
                <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #475569;">
                  You are receiving this verification code for <strong>${actionTitle.toLowerCase()}</strong> on the KL Trends Enterprise System. Please enter this code to complete verification:
                </p>
                
                <!-- OTP Box -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px;">
                  <tr>
                    <td align="center" style="padding: 20px 16px;">
                      <div style="font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #570490; font-family: 'Courier New', Courier, monospace;">${otp}</div>
                      <div style="margin-top: 8px; font-size: 12px; font-weight: 600; color: #7c3aed;">⏱ Valid for 10 minutes</div>
                    </td>
                  </tr>
                </table>

                <p style="margin: 0 0 16px 0; font-size: 12px; line-height: 18px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                  <strong style="color: #334155;">Security Note:</strong> Do not share this OTP with anyone. If you did not request this verification code, please ignore this email or notify your system administrator.
                </p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td align="center" style="background-color: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; line-height: 16px;">
                &copy; ${currentYear} KL Trends. All rights reserved.<br />
                This is an automated transactional message sent to ${to}. Please do not reply to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;

  const smtpUser = process.env.SMTP_USER?.trim().replace(/["']/g, '');
  const smtpPass = process.env.SMTP_PASS?.trim().replace(/["'\s]/g, '');

  if (!smtpUser || !smtpPass) {
    const missingMsg = `SMTP configuration is missing on the server (SMTP_USER=${smtpUser ? 'SET' : 'MISSING'}, SMTP_PASS=${smtpPass ? 'SET' : 'MISSING'}).`;
    console.error(`[Nodemailer] ⚠️ ${missingMsg}`);
    
    // In local development without SMTP, allow developer testing using the logged OTP
    if (process.env.NODE_ENV !== 'production') {
      return { success: true };
    }
    return { success: false, error: missingMsg };
  }

  try {
    const mailer = getTransporter();
    if (!mailer) {
      console.error('[Nodemailer] ❌ Transporter could not be created.');
      return { success: false, error: 'Could not create email transport' };
    }

    const fromAddress = process.env.SMTP_FROM?.trim() || `"KL Trends Security" <${smtpUser}>`;

    const info = await mailer.sendMail({
      from: fromAddress,
      to,
      subject: `${otp} is your KL Trends verification code`,
      text: plainTextContent,
      html: htmlContent,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
        'Auto-Submitted': 'auto-generated',
      },
    });

    console.log(`[Nodemailer] ✅ Email successfully delivered to ${to} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    // Reset transporter so future attempts don't reuse a broken socket
    resetTransporter();

    console.error(`[Nodemailer Error] ❌ Failed to send verification email to ${to}:`, {
      message: error?.message || 'unknown error',
      code: error?.code,
      response: error?.response,
      command: error?.command,
    });

    return {
      success: false,
      error: error?.message || 'SMTP delivery failed',
    };
  }
};
