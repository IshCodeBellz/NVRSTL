import { prisma } from "../prisma";
import { emailService } from "../email";

export interface OrderShippingRow {
  orderId: string;
  createdAt: string;
  status: string;
  customerEmail: string;
  fullName: string;
  address1: string;
  address2?: string | null;
  city: string;
  region?: string | null;
  postalCode: string;
  country: string;
  items: string;
  totalCents: number;
  currency: string;
}

export function toCsv(rows: OrderShippingRow[]): string {
  const header = [
    "orderId",
    "createdAt",
    "status",
    "customerEmail",
    "fullName",
    "address1",
    "address2",
    "city",
    "region",
    "postalCode",
    "country",
    "items",
    "totalCents",
    "currency",
  ].join(",");
  const body = rows
    .map((r) =>
      [
        r.orderId,
        r.createdAt,
        r.status,
        r.customerEmail,
        r.fullName,
        r.address1,
        r.address2 ?? "",
        r.city,
        r.region ?? "",
        r.postalCode,
        r.country,
        String(r.items).replaceAll(",", ";"),
        r.totalCents.toString(),
        r.currency,
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");
  return `${header}\n${body}`;
}

export async function generateOrderShippingRows(
  date: Date
): Promise<OrderShippingRow[]> {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: start, lte: end } },
    include: {
      user: { select: { email: true } },
      shippingAddress: true,
      items: { select: { qty: true, nameSnapshot: true, size: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return orders.map((o) => ({
    orderId: o.id,
    createdAt: o.createdAt.toISOString(),
    status: o.status,
    customerEmail: o.email,
    fullName: o.shippingAddress?.fullName ?? "",
    address1: o.shippingAddress?.line1 ?? "",
    address2: o.shippingAddress?.line2 ?? "",
    city: o.shippingAddress?.city ?? "",
    region: o.shippingAddress?.region ?? "",
    postalCode: o.shippingAddress?.postalCode ?? "",
    country: o.shippingAddress?.country ?? "",
    items: o.items
      .map((i) => `${i.qty}x ${i.nameSnapshot}${i.size ? ` (${i.size})` : ""}`)
      .join("; "),
    totalCents: o.totalCents,
    currency: o.currency,
  }));
}

export async function sendDailyOrderShippingReport(date = new Date()) {
  const rows = await generateOrderShippingRows(date);
  const csv = toCsv(rows);

  const recipients = (
    process.env.ADMIN_EMAIL_RECIPIENTS ||
    process.env.ALERT_EMAIL_RECIPIENTS ||
    ""
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    throw new Error(
      "No admin recipients configured. Set ADMIN_EMAIL_RECIPIENTS or ALERT_EMAIL_RECIPIENTS."
    );
  }

  const dateStr = new Date(date).toISOString().split("T")[0];
  await emailService.sendEmail({
    to: recipients,
    subject: `Daily Orders Shipping Report - ${dateStr}`,
    text: `Attached is the orders shipping report for ${dateStr}. Total orders: ${rows.length}.`,
    html: `<p>Attached is the orders shipping report for <strong>${dateStr}</strong>.</p><p>Total orders: <strong>${rows.length}</strong></p>`,
    attachments: [
      {
        filename: `orders-shipping-${dateStr}.csv`,
        content: Buffer.from(csv, "utf8").toString("base64"),
        encoding: "base64",
        contentType: "text/csv",
      },
    ],
  });
  return { count: rows.length };
}
