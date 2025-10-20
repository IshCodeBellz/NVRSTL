import fs from "fs";
import path from "path";
import { generateOrderShippingRows } from "../lib/server/reports/orderShippingReport";

function toCsv(rows: any[]): string {
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

async function main() {
  const arg = process.argv[2];
  const date = arg ? new Date(arg) : new Date();
  const rows = await generateOrderShippingRows(date);
  const csv = toCsv(rows);
  const dateStr = date.toISOString().split("T")[0];
  const outDir = path.join(process.cwd(), "reports");
  const outFile = path.join(outDir, `orders-shipping-${dateStr}.csv`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, csv, "utf8");
  console.log(`Saved CSV: ${outFile} (orders: ${rows.length})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
