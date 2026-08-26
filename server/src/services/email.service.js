const nodemailer = require("nodemailer");
const env = require("../config/env");
const https = require("https");

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    const user = env.smtpUser || "freelnova07@gmail.com";
    const pass = env.smtpPass || "llzicgisyslrrncd";
    const host = env.smtpHost || "smtp.gmail.com";
    const port = env.smtpPort || (host === "smtp.gmail.com" ? 587 : 465);

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false,
        ciphers: "SSLv3",
      },
    });
  }
  return transporter;
};

// ── HTTPS Dispatch for Cloud Providers (Bypasses Gmail SMTP Datacenter Blocks) ──
const sendViaResend = (apiKey, { from, to, subject, html, text }) => {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      from: process.env.RESEND_FROM || "FreelNova <no-reply@freelnova.com>",
      to: [to],
      subject,
      html,
      text,
    });

    const req = https.request(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: 10000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`Resend API HTTP ${res.statusCode}: ${data}`));
          }
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Resend API Request Timeout"));
    });
    req.write(payload);
    req.end();
  });
};

const sendViaBrevo = (apiKey, { from, to, subject, html, text }) => {
  return new Promise((resolve, reject) => {
    const senderEmail = env.smtpUser || "freelnova07@gmail.com";
    const payload = JSON.stringify({
      sender: { name: "FreelNova", email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    });

    const req = https.request(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: 10000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`Brevo API HTTP ${res.statusCode}: ${data}`));
          }
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Brevo API Request Timeout"));
    });
    req.write(payload);
    req.end();
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  const targetEmail = String(to || "").trim().toLowerCase();
  if (!targetEmail || !targetEmail.includes("@")) {
    console.warn(`[SMTP WARN] Invalid recipient email skipped: "${to}"`);
    return { success: false, error: "Invalid recipient email" };
  }

  const fromAddress = env.emailFrom || "FreelNova <freelnova07@gmail.com>";

  // 1. Try Resend HTTP API if key exists
  if (process.env.RESEND_API_KEY) {
    try {
      const resendRes = await sendViaResend(process.env.RESEND_API_KEY, {
        from: fromAddress,
        to: targetEmail,
        subject,
        html,
        text,
      });
      console.log(`[RESEND SUCCESS] Delivered OTP email to ${targetEmail} | ID: ${resendRes.id}`);
      return { success: true, messageId: resendRes.id };
    } catch (rErr) {
      console.error(`[RESEND ERROR] Resend dispatch failed, falling back: ${rErr.message}`);
    }
  }

  // 2. Try Brevo HTTP API if key exists
  if (process.env.BREVO_API_KEY || process.env.SIB_API_KEY) {
    const key = process.env.BREVO_API_KEY || process.env.SIB_API_KEY;
    try {
      const brevoRes = await sendViaBrevo(key, {
        from: fromAddress,
        to: targetEmail,
        subject,
        html,
        text,
      });
      console.log(`[BREVO SUCCESS] Delivered OTP email to ${targetEmail} | ID: ${brevoRes.messageId}`);
      return { success: true, messageId: brevoRes.messageId };
    } catch (bErr) {
      console.error(`[BREVO ERROR] Brevo dispatch failed, falling back: ${bErr.message}`);
    }
  }

  // 3. Nodemailer SMTP Transport
  try {
    const info = await getTransporter().sendMail({
      from: fromAddress,
      to: targetEmail,
      subject,
      text,
      html,
    });
    console.log(`[SMTP SUCCESS] Delivered OTP email to ${targetEmail} | MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[SMTP ERROR] Failed to deliver OTP to ${targetEmail}: ${error.message}`);
    return { success: false, error: error.message };
  }
};

const buildFreelNovaEmailHtml = ({
  headline = "Account Security Verification",
  recipientName = "User",
  introText = "Please find your secure verification code below:",
  codeLabel = "OTP CODE",
  codeValue = "",
  copyInstruction = "Press and hold (phone) or triple-click (computer) the code above to copy it.",
  whatsNextText = "Enter this code on the prompt to complete your request securely.",
  securityNote = "This code is valid for single use. If you did not request this email, please secure your credentials immediately.",
}) => {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 40px 15px;">
      <div style="max-width: 720px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12); border: 1px solid #cbd5e1;">
        
        <!-- Header Banner (1.7x Wider & Spacious) -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #090d16 0%, #0f172a 40%, #1e40af 100%); padding: 36px 48px;">
          <tr>
            <td align="left" style="vertical-align: middle;">
              <a href="https://www.freelnova.com/company-info" style="text-decoration: none; display: inline-block;">
                <span style="font-size: 32px; font-weight: 900; color: #ffffff; letter-spacing: -1px; font-family: Arial, sans-serif;">FreelNova<span style="color: #3b82f6;">.</span></span>
              </a>
            </td>
            <td align="right" style="vertical-align: middle;">
              <a href="https://www.freelnova.com/company-info" style="text-decoration: none;">
                <span style="border: 1px solid rgba(255, 255, 255, 0.4); background-color: rgba(255, 255, 255, 0.15); color: #ffffff; padding: 7px 18px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">TRUST THE PLATFORM</span>
              </a>
            </td>
          </tr>
        </table>

        <!-- Body Content -->
        <div style="padding: 40px 48px 32px 48px;">
          <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 18px; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">${headline}</h2>
          <p style="font-size: 16px; color: #334155; margin-bottom: 14px; line-height: 1.5;">Dear <strong>${recipientName}</strong>,</p>
          <p style="font-size: 15px; color: #475569; margin-bottom: 28px; line-height: 1.6;">${introText}</p>

          <!-- OTP Code Card -->
          <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 20px; padding: 30px; text-align: center; margin: 28px 0;">
            <div style="font-size: 12px; font-weight: 800; letter-spacing: 2.5px; color: #64748b; margin-bottom: 14px; text-transform: uppercase;">${codeLabel}</div>
            <div style="font-size: 42px; font-weight: 900; letter-spacing: 14px; color: #1d4ed8; font-family: Monaco, Consolas, monospace;">${codeValue}</div>
            <div style="font-size: 13px; color: #94a3b8; margin-top: 16px;">${copyInstruction}</div>
          </div>

          <!-- What's Next Box -->
          <div style="background-color: #eff6ff; border-left: 5px solid #2563eb; border-radius: 12px; padding: 20px 24px; margin: 28px 0;">
            <div style="font-weight: 800; font-size: 14px; color: #1e40af; margin-bottom: 6px;">📩 What's next?</div>
            <div style="font-size: 14px; color: #1d4ed8; line-height: 1.5;">${whatsNextText}</div>
          </div>

          <!-- Sign Off -->
          <p style="font-size: 15px; color: #64748b; margin-top: 32px; margin-bottom: 4px;">Warm regards,</p>
          <p style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 0;">Team FreelNova</p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 28px 48px; border-top: 1px solid #e2e8f0; text-align: center;">
          <div style="font-size: 12px; font-weight: 800; color: #334155; letter-spacing: 1.5px; margin-bottom: 8px; text-transform: uppercase;">
            <a href="https://www.freelnova.com/company-info" style="color: #2563eb; text-decoration: none; font-weight: 800;">FreelNova - Global Freelance Marketplace</a>
          </div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 14px;">Powered by FreelNova Technologies Pvt Ltd • All Rights Reserved</div>
          <div style="font-size: 12px; color: #2563eb; margin-bottom: 16px;">
            <a href="https://www.freelnova.com/company-info" style="color: #2563eb; text-decoration: underline; font-weight: 600;">Privacy Policy</a> • 
            <a href="https://www.freelnova.com/company-info" style="color: #2563eb; text-decoration: underline; font-weight: 600;">Terms & Conditions</a> • 
            <a href="https://www.freelnova.com/company-info" style="color: #2563eb; text-decoration: underline; font-weight: 600;">Company Info & Security</a>
          </div>
          <div style="font-size: 11px; color: #94a3b8; line-height: 1.5; max-width: 520px; margin: 0 auto;">${securityNote}</div>
        </div>

      </div>
    </div>
  `;
};

module.exports = {
  sendEmail,
  isEmailConfigured: () => true,
  buildFreelNovaEmailHtml,
};
