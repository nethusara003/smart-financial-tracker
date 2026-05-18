import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ Email service is not configured. Skipping sendEmail.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,       // smtp.gmail.com
    port: Number(process.env.EMAIL_PORT), // 587
    secure: false, // MUST be false for port 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"SFT - Smart Financial Tracker" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};
