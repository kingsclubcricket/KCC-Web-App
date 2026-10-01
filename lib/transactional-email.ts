import "server-only";
import nodemailer from "nodemailer";
import { KCC_PAYMENT_CONFIG } from "@/lib/kcc-config";

type Attachment = { filename: string; content: string; contentType?: string; contentId?: string };
type EmailMessage = { to: string; subject: string; html: string; idempotencyKey: string; attachments?: Attachment[] };

export async function sendTransactionalEmail(message: EmailMessage) {
  const user = process.env.GMAIL_USER || KCC_PAYMENT_CONFIG.senderEmail;
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  if (!appPassword) return { status: "Preview" as const, providerId: "", error: "Email preview mode: the KCC Gmail app password is not configured." };
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass: appPassword },
    });
    const info = await transporter.sendMail({
      from: `${KCC_PAYMENT_CONFIG.senderName} <${user}>`,
      to: message.to,
      subject: message.subject,
      html: message.html,
      headers: { "X-KCC-Idempotency-Key": message.idempotencyKey },
      attachments: message.attachments?.map(file => ({ filename: file.filename, content: file.content, encoding: "base64", contentType: file.contentType, cid: file.contentId })),
    });
    return { status: "Sent" as const, providerId: info.messageId || "", error: "" };
  } catch (error) {
    return { status: "Failed" as const, providerId: "", error: error instanceof Error ? error.message : "Gmail rejected the message." };
  }
}

export function emailShell(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f7f4ef;font-family:Arial,sans-serif;color:#171311"><div style="max-width:620px;margin:0 auto;padding:32px 18px"><div style="background:#171311;color:#fff;padding:20px 24px;border-radius:16px 16px 0 0"><b style="font-size:20px">KCC Ground</b></div><div style="background:#fff;padding:30px 24px;border:1px solid #e8e0d6;border-top:0;border-radius:0 0 16px 16px"><h1 style="font-size:26px;margin:0 0 16px">${title}</h1>${body}<p style="color:#6b625b;font-size:13px;margin-top:30px">KCC Ground · Secure booking communication</p></div></div></body></html>`;
}

