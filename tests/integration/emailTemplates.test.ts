import {
  buildOrderConfirmationHtml,
  buildPaymentReceiptHtml,
} from "@/lib/server/mailer";

describe("email templates", () => {
  const baseOrder: any = {
    id: "order_12345",
    totalCents: 2599,
    currency: "GBP",
  };

  test("order confirmation html contains key sections", () => {
    const html = buildOrderConfirmationHtml(baseOrder);
    expect(html).toContain("Order #order_12345 received");
    expect(html).toContain("Thanks for your order");
    expect(html).toContain("Total: £25.99");
  });

  test("payment receipt html contains key sections", () => {
    const html = buildPaymentReceiptHtml(baseOrder);
    expect(html).toContain("Payment received for #order_12345");
    expect(html).toContain("Amount: £25.99");
  });
});
