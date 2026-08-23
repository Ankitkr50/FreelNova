const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    const user = env.smtpUser || "freelnova07@gmail.com";
    const pass = env.smtpPass || "llzicgisyslrrncd";

    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const targetEmail = String(to || "").trim().toLowerCase();
  if (!targetEmail || !targetEmail.includes("@")) {
    console.warn(`[SMTP WARN] Invalid recipient email skipped: "${to}"`);
    return;
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
    return info;
  } catch (error) {
    console.error(`[SMTP ERROR] Failed to deliver OTP to ${targetEmail}: ${error.message}`);
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
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 500px;">
      <h2 style="color: #2563eb; margin-bottom: 10px;">${headline}</h2>
      <p style="font-size: 16px; color: #334155;">Dear <strong>${recipientName}</strong>,</p>
      <p style="font-size: 15px; color: #334155;">${introText}</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e40af; background-color: #f1f5f9; padding: 16px 24px; border-radius: 8px; display: inline-block; margin: 15px 0;">
        ${codeValue}
      </div>
      <p style="font-size: 14px; color: #64748b;">${whatsNextText}</p>
    </div>
  `;
};

module.exports = {
  sendEmail,
  isEmailConfigured: () => true,
  buildFreelNovaEmailHtml,
};
