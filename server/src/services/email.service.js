const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter = null;
let verifyPromise = null;

const hasNonDefaultFromAddress = () =>
  Boolean(env.emailFrom && env.emailFrom !== "noreply@freelnova.local");

const isEmailConfigured = () =>
  Boolean(
    env.smtpHost &&
      env.smtpPort &&
      env.smtpUser &&
      env.smtpPass
  );

const buildTransportOptions = () => ({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpSecure,
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass,
  },
  connectionTimeout: 15_000,
  greetingTimeout: 15_000,
  socketTimeout: 20_000,
  tls: {
    rejectUnauthorized: false,
    servername: env.smtpHost,
  },
});

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport(buildTransportOptions());
  }

  return transporter;
};

const verifyTransporter = async () => {
  if (!verifyPromise) {
    verifyPromise = getTransporter()
      .verify()
      .catch((error) => {
        verifyPromise = null;
        throw error;
      });
  }

  return verifyPromise;
};

const normalizeEmailError = (error) => {
  const message = String(error?.message || "Unknown SMTP error");

  if (/Invalid login|authentication unsuccessful|EAUTH/i.test(message)) {
    return "SMTP authentication failed. Check SMTP_USER and SMTP_PASS.";
  }

  if (/self signed|certificate|tls/i.test(message)) {
    return "SMTP TLS handshake failed. Check SMTP_SECURE and your mail provider TLS settings.";
  }

  if (/getaddrinfo|ENOTFOUND|EAI_AGAIN/i.test(message)) {
    return "SMTP host could not be resolved. Check SMTP_HOST.";
  }

  if (/ETIMEDOUT|Greeting never received|ECONNECTION/i.test(message)) {
    return "SMTP connection timed out. Check SMTP_HOST, SMTP_PORT, and firewall/provider access.";
  }

  if (/rejected|sender|from address/i.test(message)) {
    return "The mail provider rejected the sender address. Check EMAIL_FROM and provider sender rules.";
  }

  return message;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const targetEmail = String(to || "").trim().toLowerCase();
  const isTestEmail =
    process.env.NODE_ENV === "test" ||
    /\.test$|\.example$|@freelnova\.test|@skillbridge\.test|@test\.com|@example\.com/i.test(targetEmail);

  if (isTestEmail) {
    console.log(`[SANDBOX MOCK SMTP] Suppressed real SMTP send to test recipient: ${to}`);
    return;
  }

  if (!isEmailConfigured()) {
    const missing = [];
    if (!env.smtpHost) missing.push("SMTP_HOST");
    if (!env.smtpPort) missing.push("SMTP_PORT");
    if (!env.smtpUser) missing.push("SMTP_USER");
    if (!env.smtpPass) missing.push("SMTP_PASS");
    throw new Error(`Email is not configured. Missing or invalid: ${missing.join(", ")}`);
  }

  try {
    await verifyTransporter();
    const fromAddress =
      env.emailFrom && env.emailFrom !== "noreply@freelnova.local"
        ? env.emailFrom
        : `FreelNova <${env.smtpUser}>`;

    await getTransporter().sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    throw new Error(normalizeEmailError(error));
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
  const fromEmail = env.emailFrom || "support@freelnova.com";

  // Sanitize recipient name: if email address or prefix was passed, format cleanly
  let formattedName = recipientName;
  if (formattedName && formattedName.includes("@")) {
    const emailPrefix = formattedName.split("@")[0];
    formattedName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
  }
  if (!formattedName || formattedName.toLowerCase() === "user" || formattedName === "fn.freelnova") {
    formattedName = "FreelNova Member";
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FreelNova Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%); padding: 32px 40px; text-align: left;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                      Freel<span style="font-weight: 400; color: #ffffff;">Nova</span><span style="display: inline-block; width: 6px; height: 6px; background-color: #60a5fa; border-radius: 50%; margin-left: 3px; vertical-align: baseline;"></span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="background-color: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.8px;">
                      Trust The Platform
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 40px; text-align: left;">
              
              <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; line-height: 1.3;">
                ${headline}
              </h1>

              <p style="font-size: 15px; color: #334155; margin: 0 0 16px 0; line-height: 1.6;">
                Dear <strong>${formattedName}</strong>,
              </p>

              <p style="font-size: 15px; color: #334155; margin: 0 0 24px 0; line-height: 1.6;">
                ${introText}
              </p>

              ${codeValue ? `
              <!-- Highlighted Code Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0; background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; text-align: center;">
                <tr>
                  <td style="padding: 24px 16px;">
                    <span style="display: block; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                      ${codeLabel}
                    </span>
                    <span style="display: block; font-size: 32px; font-weight: 900; color: #1e40af; letter-spacing: 8px; font-family: monospace; user-select: all;">
                      ${codeValue}
                    </span>
                    ${copyInstruction ? `
                    <span style="display: block; font-size: 12px; font-weight: 600; color: #64748b; margin-top: 10px;">
                      ${copyInstruction}
                    </span>
                    ` : ''}
                  </td>
                </tr>
              </table>
              ` : ''}

              ${whatsNextText ? `
              <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
                <p style="font-size: 14px; color: #1e3a8a; font-weight: 700; margin: 0 0 4px 0;">📩 What's next?</p>
                <p style="font-size: 13px; color: #1e40af; margin: 0; line-height: 1.5;">${whatsNextText}</p>
              </div>
              ` : ''}

              <p style="font-size: 14px; color: #475569; margin: 32px 0 0 0; line-height: 1.6;">
                Warm regards,<br>
                <strong>Team FreelNova</strong>
              </p>
            </td>
          </tr>

          <!-- Footer Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0;">
            </td>
          </tr>

          <!-- Footer Legal -->
          <tr>
            <td style="padding: 28px 40px; background-color: #f8fafc; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6;">
              <p style="font-weight: 700; color: #334155; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 1px;">
                TRUST THE PLATFORM · <a href="mailto:${fromEmail}" style="color: #2563eb; text-decoration: none;">${fromEmail}</a>
              </p>
              <p style="margin: 0 0 12px 0; font-size: 11px;">
                Powered by FreelNova Technologies Pvt Ltd • All Rights Reserved
              </p>
              <p style="margin: 0 0 12px 0; font-size: 11px; font-weight: 600;">
                <a href="https://freelnova.com/privacy" style="color: #2563eb; text-decoration: underline;" target="_blank">Privacy Policy</a> &nbsp;•&nbsp; 
                <a href="https://freelnova.com/terms" style="color: #2563eb; text-decoration: underline;" target="_blank">Terms &amp; Conditions</a> &nbsp;•&nbsp; 
                <a href="mailto:${fromEmail}" style="color: #2563eb; text-decoration: underline;">Support</a>
              </p>
              ${securityNote ? `
              <p style="margin: 16px 0 0 0; font-size: 11px; color: #94a3b8;">
                ${securityNote}
              </p>
              ` : ''}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

module.exports = {
  sendEmail,
  isEmailConfigured,
  buildFreelNovaEmailHtml,
};
