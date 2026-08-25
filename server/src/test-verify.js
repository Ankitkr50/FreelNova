const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "freelnova07@gmail.com",
    pass: "llzicgisyslrrncd",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

console.log("Verifying Nodemailer SMTP authentication...");

transporter.verify((err, success) => {
  if (err) {
    console.error("❌ VERIFY FAILED!");
    console.error("Error code:", err.code);
    console.error("Error response:", err.response);
    console.error("Full message:", err.message);
  } else {
    console.log("✅ VERIFY SUCCESSFUL!");
  }
});
