const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    const user = env.smtpUser || "freelnova07@gmail.com";
    const pass = env.smtpPass || "llzicgisyslrrncd";

    if (env.smtpHost && env.smtpHost !== "smtp.gmail.com") {
      transporter = nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort || 465,
        secure: env.smtpSecure !== undefined ? env.smtpSecure : true,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      });
    } else {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      });
    }
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const targetEmail = String(to || "").trim().toLowerCase();
  if (!targetEmail || !targetEmail.includes("@")) {
    console.warn(`[SMTP WARN] Invalid recipient email skipped: "${to}"`);
    return { success: false, error: "Invalid recipient email" };
  }

  const fromAddress = env.emailFrom || "FreelNova <freelnova07@gmail.com>";

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
