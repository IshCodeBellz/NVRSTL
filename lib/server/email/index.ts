/* eslint-disable */
import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { Resend } from "resend";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Mail.Attachment[];
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private resend: Resend | null;

  constructor(config: EmailConfig) {
    this.transporter = nodemailer.createTransport(config);
    this.resend = process.env.RESEND_API_KEY
      ? new Resend(process.env.RESEND_API_KEY)
      : null;
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    const fromValue =
      process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;

    // 1) Try SMTP first
    try {
      await this.transporter.sendMail({ from: fromValue, ...message });
      return;
    } catch (smtpError) {
      console.error("SMTP send failed:", smtpError);
    }

    // 2) Try Resend if configured
    if (this.resend) {
      try {
        const attachments = message.attachments?.map((a) => ({
          filename: a.filename || "attachment.csv",
          content: Buffer.isBuffer((a as any).content)
            ? (a as any).content.toString("base64")
            : Buffer.from(String((a as any).content)).toString("base64"),
        }));
        const options: any = {
          from: fromValue || "no-reply@example.com",
          to: Array.isArray(message.to) ? message.to : [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          attachments,
        };
        const result: any = await this.resend.emails.send(options as any);
        if (result?.error) throw result.error;
        return;
      } catch (resendError) {
        console.error("Resend send failed:", resendError);
      }
    }

    // 3) Final fallback: Ethereal test account (preview URL)
    try {
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      const info = await testTransporter.sendMail({
        from: fromValue || `DY Official Test <no-reply@example.com>`,
        ...message,
      });
      const url = nodemailer.getTestMessageUrl(info);
      console.log(`Ethereal test email sent. Preview: ${url}`);
      return;
    } catch (etherealError) {
      console.error("Ethereal fallback failed:", etherealError);
      throw etherealError;
    }
  }

  async sendAlert(
    subject: string,
    message: string,
    recipients: string[]
  ): Promise<void> {
    await this.sendEmail({
      to: recipients,
      subject: `[DY Official Alert] ${subject}`,
      text: message,
      html: `<div style="font-family: Arial, sans-serif;">
        <h2 style="color: #e74c3c;">System Alert</h2>
        <h3>${subject}</h3>
        <p>${message}</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          This is an automated alert from DY Official monitoring system.
        </p>
      </div>`,
    });
  }
}

// Create default email service
export const emailService = new EmailService({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

// Helper function for sending alerts
export async function sendAlert(
  subject: string,
  message: string
): Promise<void> {
  const recipients = process.env.ALERT_EMAIL_RECIPIENTS?.split(",") || [];
  if (recipients.length > 0) {
    await emailService.sendAlert(subject, message, recipients);
  }
}
