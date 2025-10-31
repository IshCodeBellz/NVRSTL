// Simple email abstraction with MailerSend provider in production
import type { Order, User } from "@prisma/client";
import { emailService } from "@/lib/server/email";
import { formatPriceCents } from "@/lib/money";
import type { JerseyCustomization } from "@/lib/types";

// Production provider integration (MailerSend) with graceful fallback.
interface ProviderDriver {
  send(opts: {
    to: string;
    subject: string;
    text: string;
    html: string;
    attachments?: Array<{ filename: string; content: string }>; // base64
  }): Promise<void>;
}

class MailerSendDriver implements ProviderDriver {
  #mailer: any;
  #fromEmail: string;
  #fromName: string;
  constructor(apiKey: string, fromEmail: string, fromName: string) {
    // Lazy import to avoid adding heavy deps to tests until used
    const { MailerSend } = require("mailersend");
    this.#mailer = new MailerSend({ apiKey });
    this.#fromEmail = fromEmail;
    this.#fromName = fromName;
  }
  async send(opts: {
    to: string;
    subject: string;
    text: string;
    html: string;
    attachments?: Array<{ filename: string; content: string }>;
  }) {
    const {
      EmailParams,
      Sender,
      Recipient,
      Attachment,
    } = require("mailersend");
    const from = new Sender(this.#fromEmail, this.#fromName || undefined);
    const recipients = [new Recipient(opts.to, undefined)];

    const emailParams = new EmailParams()
      .setFrom(from)
      .setTo(recipients)
      .setSubject(opts.subject)
      .setText(opts.text)
      .setHtml(opts.html);

    // Attachments (CSV reports, etc.)
    if (Array.isArray(opts.attachments) && opts.attachments.length > 0) {
      try {
        const atts = opts.attachments.map(
          (a) =>
            // MailerSend expects base64-encoded content
            new Attachment({
              filename: a.filename,
              content: a.content,
            })
        );
        emailParams.setAttachments?.(atts);
      } catch {
        // Fallback if Attachment class signature changes - set raw
        const atts = opts.attachments.map((a) => ({
          filename: a.filename,
          content: a.content,
        }));
        (emailParams as any).attachments = atts;
      }
    }

    try {
      await this.#mailer.email.send(emailParams);
    } catch (err: any) {
      console.error("[MAIL:mailersend_error]", err);

      // Check if it's a MailerSend API error
      if (err?.body?.message || err?.response?.body?.message) {
        const errorMsg = err.body?.message || err.response?.body?.message;
        const statusCode = err.statusCode || err.response?.statusCode;

        // Check for domain verification errors
        if (errorMsg?.includes("verified domains") || statusCode === 422) {
          console.error(
            "[MAIL:mailersend_error] Domain verification issue. This might mean:",
            "1. MailerSend account is in sandbox/test mode",
            "2. Recipient domain restrictions are enabled",
            "3. Sender domain is not properly verified in MailerSend dashboard"
          );
        }
      }

      throw err;
    }
  }
}

export interface Mailer {
  send(opts: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    attachments?: Array<{
      filename: string;
      content: string;
      contentType?: string;
    }>;
  }): Promise<void>;
}

class ConsoleMailer implements Mailer {
  async send(opts: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    attachments?: Array<{
      filename: string;
      content: string;
      contentType?: string;
    }>;
  }) {
    console.log("[MAIL:send]", JSON.stringify(opts, null, 2));
  }
}

let _mailer: Mailer | null = null;
export function getMailer(): Mailer {
  if (_mailer) return _mailer;
  // In CI or test environments, avoid hitting external APIs.
  const isCiOrTest =
    process.env.CI === "true" || process.env.NODE_ENV === "test";
  if (!isCiOrTest && process.env.MAILERSEND_API_KEY) {
    const fromEmail = process.env.EMAIL_FROM || "no-reply@nvrstl.co.uk";
    const fromName = process.env.EMAIL_FROM_NAME || "NVRSTL";
    const driver = new MailerSendDriver(
      process.env.MAILERSEND_API_KEY,
      fromEmail,
      fromName
    );
    _mailer = {
      async send(o) {
        const html = o.html || `<pre>${o.text}</pre>`;
        const attachments = Array.isArray(o.attachments)
          ? o.attachments.map((a) => ({
              filename: a.filename,
              content: Buffer.isBuffer((a as any).content)
                ? (a as any).content.toString("base64")
                : Buffer.from(String((a as any).content)).toString("base64"),
            }))
          : undefined;
        await driver.send({
          to: o.to,
          subject: o.subject,
          text: o.text,
          html,
          attachments,
        });
      },
    };
  } else {
    _mailer = new ConsoleMailer();
  }
  return _mailer;
}

// --- HTML Template Helpers (simple inline styles for snapshot safety) ---

function baseLayout(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.45;color:#222;margin:0;padding:24px;background:#fafafa;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:6px;overflow:hidden;">
    <tr><td style="background:#111;color:#fff;padding:16px 20px;font-size:18px;font-weight:600;">${title}</td></tr>
    <tr><td style="padding:20px;font-size:14px;">${bodyHtml}</td></tr>
    <tr><td style="padding:16px 20px;font-size:11px;color:#666;background:#f5f5f5;">This email was sent automatically. If you have questions reply to this address.</td></tr>
  </table>
  </body></html>`;
}

// Exported helper to render any email content inside the site theme layout
export function renderEmailLayout(title: string, bodyHtml: string): string {
  return baseLayout(title, bodyHtml);
}

// Legacy minimal confirmation (kept for backward compatibility)
export function buildOrderConfirmationHtml(order: Order) {
  return baseLayout(
    `Order #${order.id} received`,
    `<p>Thanks for your order. We've received it and it's now awaiting payment.</p>
     <p style="margin:12px 0 4px;font-weight:600;">Total: ${formatPriceCents(
       order.totalCents,
       { currency: order.currency }
     )}</p>
     <p style="color:#666;font-size:12px;margin-top:16px;">You will receive another email when payment is confirmed.</p>`
  );
}

// --- Rich Order Confirmation (line items + delivery details) ---
export interface OrderEmailLine {
  name: string;
  sku: string;
  size?: string | null;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
  imageUrl?: string | null;
  customizations?: JerseyCustomization | null;
}
export interface OrderEmailAddress {
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postalCode: string;
  country: string;
  phone?: string | null;
}
export interface RichOrderEmailPayload {
  orderId: string;
  currency: string;
  lines: OrderEmailLine[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
  shipping: OrderEmailAddress;
  billing?: OrderEmailAddress;
  estimatedDelivery?: string; // e.g. "3–5 business days"
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = process.env.NEXTAUTH_URL || process.env.APP_URL || "";
  if (!base) return null;
  return `${base.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

function describeCustomizations(
  customizations?: JerseyCustomization | null
): string[] {
  if (!customizations) return [];
  const c: Record<string, unknown> = customizations as any;
  const pretty = (s?: string) =>
    (s || "none").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  const rows: string[] = [];
  const patch = c.patch as string | undefined;
  if (patch && patch !== "none") rows.push(`Patch: ${pretty(patch)}`);
  const patch2 = c.patch2 as string | undefined;
  if (patch2 && patch2 !== "none") rows.push(`Second Patch: ${pretty(patch2)}`);
  const sleeve = c.sleeveAd as string | undefined;
  if (sleeve && sleeve !== "none") rows.push(`Sleeve: ${pretty(sleeve)}`);
  const nameAndNumber = c.nameAndNumber as
    | { font?: string; name?: string; number?: string }
    | undefined;
  if (nameAndNumber) {
    const parts = [nameAndNumber.name, nameAndNumber.number]
      .filter(Boolean)
      .join(" ");
    if (parts) {
      const font = nameAndNumber.font
        ? ` (${String(nameAndNumber.font).toUpperCase()})`
        : "";
      rows.push(`Name & Number: ${parts}${font}`);
    }
  }
  const notes = c.notes as string | undefined;
  if (notes) rows.push(`Notes: ${notes}`);
  return rows;
}

function renderCustomizationHtml(rows: string[]): string {
  if (!rows.length) return "";
  const items = rows.map((r) => `<li>${escapeHtml(r)}</li>`).join("");
  return `<ul style="margin:6px 0 0 16px;padding:0 0 0 8px;color:#555;font-size:11px;list-style:disc;">${items}</ul>`;
}

function renderCustomizationText(rows: string[]): string {
  if (!rows.length) return "";
  return rows.map((r) => `    - ${r}`).join("\n");
}

function addressBlock(label: string, a?: OrderEmailAddress) {
  if (!a) return "";
  const parts = [
    escapeHtml(a.line1),
    a.line2 ? escapeHtml(a.line2) : null,
    escapeHtml(
      `${a.city}${a.region ? ", " + a.region : ""} ${a.postalCode}`.trim()
    ),
    escapeHtml(a.country),
  ];
  return `<div style="margin-top:12px;"><div style="font-weight:600;margin-bottom:4px;">${label}</div><div style="font-size:12px;line-height:1.4;color:#333;">${parts
    .filter(Boolean)
    .join("<br/>")}${
    a.phone ? `<br/>Tel: ${escapeHtml(a.phone)}` : ""
  }</div></div>`;
}

export function buildRichOrderConfirmationHtml(d: RichOrderEmailPayload) {
  const linesHtml = d.lines
    .map((l) => {
      const resolvedImage = resolveImageUrl(l.imageUrl || undefined);
      const customizationRows = describeCustomizations(l.customizations);
      const customizationHtml = renderCustomizationHtml(customizationRows);
      return `<tr>
        <td style=\"padding:6px 8px;border-bottom:1px solid #eee;width:76px;\">${
          resolvedImage
            ? `<img src="${escapeHtml(resolvedImage)}" alt="${escapeHtml(
                l.name
              )}" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:4px;" />`
            : `<div style="width:64px;height:64px;background:#f0f0f0;border-radius:4px;"></div>`
        }</td>
        <td style=\"padding:6px 8px;border-bottom:1px solid #eee;\">${escapeHtml(
          l.name
        )}${
        l.size
          ? `<div style=\"color:#666;font-size:11px;\">Size: ${escapeHtml(
              l.size
            )}</div>`
          : ""
      }<div style=\"color:#999;font-size:10px;\">SKU: ${escapeHtml(
        l.sku
      )}</div>${customizationHtml}</td>
        <td style=\"padding:6px 8px;text-align:center;border-bottom:1px solid #eee;\">${
          l.qty
        }</td>
        <td style=\"padding:6px 8px;text-align:right;border-bottom:1px solid #eee;\">${formatPriceCents(
          l.unitPriceCents,
          { currency: d.currency }
        )}</td>
        <td style=\"padding:6px 8px;text-align:right;border-bottom:1px solid #eee;font-weight:600;\">${formatPriceCents(
          l.lineTotalCents,
          { currency: d.currency }
        )}</td>
      </tr>`;
    })
    .join("");

  const money = (c: number) => formatPriceCents(c, { currency: d.currency });
  const summary = `<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin-top:16px;font-size:13px;\">
    <tr><td style=\"padding:4px 0;color:#555;\">Subtotal</td><td style=\"padding:4px 0;text-align:right;\">${money(
      d.subtotalCents
    )}</td></tr>
    ${
      d.discountCents
        ? `<tr><td style=\"padding:4px 0;color:#c00;\">Discount</td><td style=\"padding:4px 0;text-align:right;color:#c00;\">- ${money(
            d.discountCents
          )}</td></tr>`
        : ""
    }
    <tr><td style=\"padding:4px 0;color:#555;\">Tax</td><td style=\"padding:4px 0;text-align:right;\">${money(
      d.taxCents
    )}</td></tr>
    <tr><td style=\"padding:4px 0;color:#555;\">Shipping</td><td style=\"padding:4px 0;text-align:right;\">${money(
      d.shippingCents
    )}</td></tr>
    <tr><td style=\"padding:6px 0;font-weight:600;border-top:1px solid #ddd;\">Total</td><td style=\"padding:6px 0;text-align:right;font-weight:600;border-top:1px solid #ddd;\">${money(
      d.totalCents
    )}</td></tr>
  </table>`;

  const est = d.estimatedDelivery
    ? `<p style=\"margin:8px 0 0;font-size:12px;color:#444;\">Estimated delivery: <strong>${d.estimatedDelivery}</strong></p>`
    : "";

  return baseLayout(
    `Order #${d.orderId} details`,
    `<p style=\"margin:0 0 12px;\">Thanks for your order—it's been received and is awaiting payment confirmation.</p>
     <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"border-collapse:collapse;border:1px solid #eee;font-size:12px;\">
       <thead><tr style=\"background:#fafafa;\"><th align=\"left\" style=\"padding:8px 8px;border-bottom:1px solid #eee;\">Item</th><th align=\"left\" style=\"padding:8px 8px;border-bottom:1px solid #eee;\">Details</th><th style=\"padding:8px 8px;border-bottom:1px solid #eee;\">Qty</th><th align=\"right\" style=\"padding:8px 8px;border-bottom:1px solid #eee;\">Unit</th><th align=\"right\" style=\"padding:8px 8px;border-bottom:1px solid #eee;\">Line</th></tr></thead>
       <tbody>${linesHtml}</tbody>
     </table>
     ${summary}
     ${addressBlock("Shipping Address", d.shipping)}
     ${
       d.billing && JSON.stringify(d.billing) !== JSON.stringify(d.shipping)
         ? addressBlock("Billing Address", d.billing)
         : ""
     }
     ${est}
     <p style=\"margin-top:18px;font-size:11px;color:#777;\">You will receive another email once payment is captured.</p>`
  );
}

export function buildRichOrderConfirmationText(d: RichOrderEmailPayload) {
  const lines = d.lines
    .map((l) => {
      const baseLine = `${l.name}${l.size ? ` (Size: ${l.size})` : ""} x${
        l.qty
      } @ ${formatPriceCents(l.unitPriceCents, {
        currency: d.currency,
      })} = ${formatPriceCents(l.lineTotalCents, { currency: d.currency })}`;
      const customizationRows = describeCustomizations(l.customizations);
      const customizationText = renderCustomizationText(customizationRows);
      return customizationText ? `${baseLine}\n${customizationText}` : baseLine;
    })
    .join("\n");
  const money = (c: number) => formatPriceCents(c, { currency: d.currency });
  const addr = (a: OrderEmailAddress) =>
    [
      a.fullName,
      a.line1,
      a.line2,
      `${a.city}${a.region ? ", " + a.region : ""} ${a.postalCode}`,
      a.country,
    ]
      .filter(Boolean)
      .join(" | ");
  return `Order #${d.orderId}\n\nItems:\n${lines}\n\nSubtotal: ${money(
    d.subtotalCents
  )}\n${
    d.discountCents ? `Discount: -${money(d.discountCents)}\n` : ""
  }Tax: ${money(d.taxCents)}\nShipping: ${money(
    d.shippingCents
  )}\nTotal: ${money(d.totalCents)}\n\nShip To: ${addr(d.shipping)}${
    d.billing && JSON.stringify(d.billing) !== JSON.stringify(d.shipping)
      ? `\nBill To: ${addr(d.billing)}`
      : ""
  }\n${
    d.estimatedDelivery ? `Estimated Delivery: ${d.estimatedDelivery}\n` : ""
  }\nStatus: Awaiting Payment`;
}

export async function sendRichOrderConfirmation(
  user: User,
  payload: RichOrderEmailPayload
) {
  const html = buildRichOrderConfirmationHtml(payload);
  const text = buildRichOrderConfirmationText(payload);
  await emailService.sendEmail({
    to: user.email,
    subject: `Order #${payload.orderId} confirmation`,
    text,
    html,
  });
}

export function buildPaymentReceiptHtml(order: Order) {
  return baseLayout(
    `Payment received for #${order.id}`,
    `<p>We've captured payment for your order.</p>
     <p style="margin:12px 0 4px;font-weight:600;">Amount: ${formatPriceCents(
       order.totalCents,
       { currency: order.currency }
     )}</p>
     <p style="color:#666;font-size:12px;margin-top:16px;">We'll start fulfilling it shortly.</p>`
  );
}

export function buildPasswordResetHtml(url: string) {
  return baseLayout(
    `Password reset instructions`,
    `<p>Click the link below to reset your password:</p>
     <p style="margin:16px 0;"><a style="background:#111;color:#fff;text-decoration:none;padding:10px 16px;border-radius:4px;display:inline-block;font-size:14px;" href="${url}">Reset Password</a></p>
     <p style="color:#666;font-size:12px;">If you did not request this you can ignore this email.</p>`
  );
}

export function buildEmailVerificationHtml(url: string) {
  return baseLayout(
    `Verify your email address`,
    `<p>Please verify your email address to complete your account setup:</p>
     <p style="margin:16px 0;"><a style="background:#007bff;color:#fff;text-decoration:none;padding:10px 16px;border-radius:4px;display:inline-block;font-size:14px;" href="${url}">Verify Email Address</a></p>
     <p style="color:#666;font-size:12px;">This link will expire in 24 hours. If you did not create an account, you can ignore this email.</p>`
  );
}

export async function sendOrderConfirmation(user: User, order: Order) {
  const html = buildOrderConfirmationHtml(order);
  await emailService.sendEmail({
    to: user.email,
    subject: `Order #${order.id} confirmation`,
    text: `We received your order totaling ${formatPriceCents(
      order.totalCents,
      {
        currency: order.currency,
      }
    )}. Thank you!`,
    html,
  });
}

export async function sendPaymentReceipt(user: User, order: Order) {
  const html = buildPaymentReceiptHtml(order);
  await emailService.sendEmail({
    to: user.email,
    subject: `Payment received for order #${order.id}`,
    text: `Your payment for ${formatPriceCents(order.totalCents, {
      currency: order.currency,
    })} has been captured. We'll start processing your order.`,
    html,
  });
}

export async function sendPasswordReset(user: { email: string }, url: string) {
  const mailer = getMailer();
  const html = buildPasswordResetHtml(url);
  await mailer.send({
    to: user.email,
    subject: `Reset your password`,
    text: `Reset your password: ${url}`,
    html,
  });
}

export async function sendEmailVerification(
  email: string,
  userId: string,
  verificationUrl: string
) {
  const mailer = getMailer();
  const html = buildEmailVerificationHtml(verificationUrl);
  await mailer.send({
    to: email,
    subject: `Verify your email address`,
    text: `Please verify your email address by visiting: ${verificationUrl}`,
    html,
  });
}
