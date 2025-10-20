import {
  getMailer,
  sendOrderConfirmation,
  sendPaymentReceipt,
} from "@/lib/server/mailer";
import { prisma } from "@/lib/server/prisma";

describe("mailer branch coverage", () => {
  test("sendOrderConfirmation + sendPaymentReceipt invoke underlying mailer", async () => {
    // Temporarily remove RESEND_API_KEY to force console mailer
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    // Clear the cached mailer instance by requiring the module fresh
    jest.resetModules();
    const {
      sendOrderConfirmation,
      sendPaymentReceipt,
    } = require("@/lib/server/mailer");

    const user = await prisma.user.create({
      data: {
        id: "mail-u-" + Date.now(),
        email:
          "mail-" + Math.random().toString(36).slice(2, 8) + "@example.com",
        passwordHash: "x",
        isAdmin: false,
      },
    });
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        email: user.email,
        subtotalCents: 1000,
        discountCents: 0,
        taxCents: 0,
        shippingCents: 0,
        totalCents: 1000,
        status: "PENDING",
      },
    });

    const spy = jest.spyOn(console, "log").mockImplementation(() => {
      /* swallow log */
    });

    await sendOrderConfirmation(user as any, order as any);
    await sendPaymentReceipt(user as any, order as any);

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();

    // Restore the original key
    if (originalKey) {
      process.env.RESEND_API_KEY = originalKey;
    }
  });
});
