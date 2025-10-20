import * as report from "@/lib/server/reports/orderShippingReport";
import { prisma } from "@/lib/server/prisma";
import * as emailIndex from "@/lib/server/email";

describe("daily order shipping report", () => {
  test("generates CSV and sends email with attachment", async () => {
    // Seed a minimal order for today
    const user = await prisma.user.create({
      data: {
        id: "rep-u-" + Date.now(),
        email: `rep_${Math.random().toString(36).slice(2, 8)}@example.com`,
        passwordHash: "x",
        isAdmin: true,
      },
    });
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        email: user.email,
        subtotalCents: 2000,
        discountCents: 0,
        taxCents: 0,
        shippingCents: 0,
        totalCents: 2000,
        status: "PAID",
        currency: "GBP",
      },
    });
    const shipAddr = await prisma.address.create({
      data: {
        userId: user.id,
        fullName: "Test User",
        line1: "123 Test St",
        city: "London",
        postalCode: "N1 1AA",
        country: "GB",
        isDefault: true,
      },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { shippingAddressId: shipAddr.id },
    });
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: (
          await prisma.product.create({
            data: {
              sku: "REP-SKU",
              name: "Rep Prod",
              description: "d",
              priceCents: 2000,
            },
          })
        ).id,
        qty: 1,
        sku: "REP-SKU",
        nameSnapshot: "Rep Prod",
        unitPriceCents: 2000,
        priceCentsSnapshot: 2000,
        lineTotalCents: 2000,
      },
    });

    // Configure recipients via env
    process.env.ADMIN_EMAIL_RECIPIENTS = "ops@example.com";

    // Spy on emailService to capture payload
    const spy = jest
      .spyOn(emailIndex.emailService, "sendEmail")
      .mockResolvedValue();

    const res = await report.sendDailyOrderShippingReport(new Date());
    expect(res.count).toBeGreaterThanOrEqual(1);
    expect(spy).toHaveBeenCalled();
    const payload = spy.mock.calls[0][0];
    expect(payload.subject).toMatch(/Daily Orders Shipping Report/);
    expect(payload.attachments?.[0]?.filename).toMatch(
      /orders-shipping-.*\.csv/
    );
    expect(payload.attachments?.[0]?.content).toContain("orderId");
    spy.mockRestore();
  });
});
