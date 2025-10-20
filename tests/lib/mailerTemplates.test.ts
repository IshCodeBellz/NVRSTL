import {
  buildOrderConfirmationHtml,
  buildPaymentReceiptHtml,
} from "@/lib/server/mailer";

describe("mailer templates quick checks", () => {
  const order: any = { id: "o1", totalCents: 12345 };
  test("order confirmation contains total and id", () => {
    const html = buildOrderConfirmationHtml(order);
    expect(html).toContain("o1");
    expect(html).toContain("123.45");
  });
  test("payment receipt contains amount", () => {
    const html = buildPaymentReceiptHtml(order);
    expect(html).toContain("123.45");
  });
});
