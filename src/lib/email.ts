// import { Resend } from "resend";
import nodemailer from 'nodemailer';

// const resend = new Resend(process.env.RESEND_API_KEY);
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getCodeExpiryTime(minutes: number = 10): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export async function sendVerificationEmail(
  email: string,
  code: string,
  name?: string
): Promise<boolean> {
  try {
    await transporter.sendMail({
      // from: "StudyLens <noreply@studylens.online>",
      from: "StudyLens <studylens00@gmail.com>",
      to: email,
      subject: "Verify your StudyLens account",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8b5cf6;">📚 StudyLens</h1>
          <h2>Verify your email</h2>
          <p>Hi ${name || "there"},</p>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #8b5cf6;">${code}</span>
          </div>
          <p>This code expires in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #6b7280; font-size: 12px;">© StudyLens - AI Visual Learning Companion</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return false;
  }
}

export async function sendWelcomeEmail(
  email: string,
  name?: string
): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: "StudyLens <noreply@studylens.online>",
      to: email,
      subject: "Welcome to StudyLens! 🎉",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8b5cf6;">📚 Welcome to StudyLens!</h1>
          <p>Hi ${name || "there"},</p>
          <p>Your email has been verified successfully. You're all set to start learning!</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 20px 0;">Start Learning</a>
          <p>Happy studying! 🚀</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return false;
  }
}

export async function sendForgotPasswordEmail(
  email: string,
  name: string,
  resetUrl: string
): Promise<boolean> {
  try {
    await transporter.sendMail({
      to: email,
      subject: "Reset Your Password - StudyLens",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>Hi ${name || "there"},</p>
          <p>You requested to reset your password. Click the button below to proceed:</p>
          <a href="${resetUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            Reset Password
          </a>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #6b7280; font-size: 14px;">StudyLens Team</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.log("Failed to send password reset email:", error);
    return false;
  }
}
