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
      from: process.env.RESEND_FROM || "onboarding@resend.dev",
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
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 30px 10px;">
      <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
        
        <!-- Header Banner -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #0f172a 0%, #1e40af 100%); padding: 24px 32px;">
          <tr>
            <td align="left">
              <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">FreelNova<span style="color: #60a5fa;">.</span></span>
            </td>
            <td align="right">
              <span style="border: 1px solid rgba(255, 255, 255, 0.35); background-color: rgba(255, 255, 255, 0.12); color: #ffffff; padding: 5px 14px; border-radius: 9999px; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">TRUST THE PLATFORM</span>
            </td>
          </tr>
        </table>

        <!-- Body Content -->
        <div style="padding: 32px 32px 24px 32px;">
          <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 16px; font-size: 22px; font-weight: 800; letter-spacing: -0.3px;">${headline}</h2>
          <p style="font-size: 15px; color: #334155; margin-bottom: 12px; line-height: 1.5;">Dear <strong>${recipientName}</strong>,</p>
          <p style="font-size: 14px; color: #475569; margin-bottom: 24px; line-height: 1.6;">${introText}</p>

          <!-- OTP Code Card -->
          <div style="background-color: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
            <div style="font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #64748b; margin-bottom: 12px; text-transform: uppercase;">${codeLabel}</div>
            <div style="font-size: 36px; font-weight: 900; letter-spacing: 12px; color: #1d4ed8; font-family: monospace;">${codeValue}</div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 14px;">${copyInstruction}</div>
          </div>

          <!-- What's Next Box -->
          <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 10px; padding: 16px 20px; margin: 24px 0;">
            <div style="font-weight: 700; font-size: 13px; color: #1e40af; margin-bottom: 4px;">📩 What's next?</div>
            <div style="font-size: 13px; color: #1d4ed8; line-height: 1.5;">${whatsNextText}</div>
          </div>

          <!-- Sign Off -->
          <p style="font-size: 14px; color: #64748b; margin-top: 28px; margin-bottom: 4px;">Warm regards,</p>
          <p style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 0;">Team FreelNova</p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #f1f5f9; text-align: center;">
          <div style="font-size: 11px; font-weight: 800; color: #475569; letter-spacing: 1.5px; margin-bottom: 6px; text-transform: uppercase;">
            TRUST THE PLATFORM • <a href="https://www.freelnova.com" style="color: #2563eb; text-decoration: none;">FREELNOVA</a>
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 12px;">Powered by FreelNova Technologies Pvt Ltd • All Rights Reserved</div>
          <div style="font-size: 11px; color: #2563eb; margin-bottom: 14px;">
            <a href="https://www.freelnova.com/privacy" style="color: #2563eb; text-decoration: underline;">Privacy Policy</a> • 
            <a href="https://www.freelnova.com/terms" style="color: #2563eb; text-decoration: underline;">Terms & Conditions</a> • 
            <a href="mailto:freelnova07@gmail.com" style="color: #2563eb; text-decoration: underline;">Support</a>
          </div>
          <div style="font-size: 11px; color: #94a3b8; line-height: 1.5; max-width: 440px; margin: 0 auto;">${securityNote}</div>
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
