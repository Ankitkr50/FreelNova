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
      from: from || "FreelNova <onboarding@resend.dev>",
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
  headline = "Verification Code",
  recipientName = "User",
  introText = "Please find your secure code below:",
  codeLabel = "VERIFICATION CODE",
  codeValue = "",
  copyInstruction = "Press and hold (phone) or triple-click (computer) the code above to copy it.",
  whatsNextText = "Enter this code on the FreelNova verification screen to complete your request.",
  securityNote = "If you didn't request this email, you can safely ignore it.",
}) => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
        <span style="font-size: 20px; font-weight: bold; color: #2563eb;">FreelNova</span>
        <span style="font-size: 12px; color: #64748b; margin-left: 8px;">www.freelnova.com</span>
      </div>
      <h2 style="color: #1e40af; margin-bottom: 10px; font-size: 20px;">${headline}</h2>
      <p style="font-size: 15px; color: #334155;">Dear <strong>${recipientName}</strong>,</p>
      <p style="font-size: 14px; color: #334155;">${introText}</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e40af; background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 16px 24px; border-radius: 8px; display: inline-block; margin: 15px 0; text-align: center;">
        ${codeValue}
      </div>
      <p style="font-size: 13px; color: #64748b;">${whatsNextText}</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">${securityNote} | <a href="https://www.freelnova.com" style="color: #2563eb; text-decoration: none;">https://www.freelnova.com</a></p>
    </div>
  `;
};

module.exports = {
  sendEmail,
  isEmailConfigured: () => true,
  buildFreelNovaEmailHtml,
};
