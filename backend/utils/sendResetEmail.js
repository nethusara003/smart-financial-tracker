import nodemailer from "nodemailer";

export const sendResetEmail = async (to, resetToken) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ Email service is not configured. Skipping sendResetEmail.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"SFT - Smart Financial Tracker" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Password Reset",
    html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset.</p>
      <p>
        <a href="${resetUrl}">Click here to reset your password</a>
      </p>
      <p>This link expires in 15 minutes.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};
