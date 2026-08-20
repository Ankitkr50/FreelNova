const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "freelnova61@gmail.com",
    pass: "kapwbksafigewttk"
  },
  connectionTimeout: 10000
});

transporter.verify()
  .then(() => {
    console.log("SUCCESS: SMTP Authentication Succeeded for freelnova61@gmail.com!");
  })
  .catch((err) => {
    console.error("ERROR: Failed SMTP connection test -", err.message || err);
  });
