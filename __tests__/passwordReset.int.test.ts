import { prisma } from "@/lib/server/prisma";
import { prismaX } from "@/lib/server/prismaEx";
import {
  createPasswordResetToken,
  consumePasswordResetToken,
} from "@/lib/server/passwordReset";

// Minimal integration-style test (does not send real email) ensuring token lifecycle works.
describe("password reset token lifecycle", () => {
  const email = "pwreset@example.com";
  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prismaX.passwordResetToken.deleteMany({});
    await prisma.user.create({
      data: { email, passwordHash: "x", isAdmin: false },
    });
  });
  it("creates and consumes a token", async () => {
    const created = await createPasswordResetToken(email);
    expect(created).toBeTruthy();
    if (!created) return;
    const attempt = await consumePasswordResetToken(
      created.token,
      "newPass123!"
    );
    expect(attempt.ok).toBe(true);
  });

  it("rejects an invalid token", async () => {
    const attempt = await consumePasswordResetToken("does-not-exist", "pass");
    expect(attempt.ok).toBe(false);
    expect(attempt.reason).toBe("invalid");
  });

  it("rejects an expired token", async () => {
    const created = await createPasswordResetToken(email);
    expect(created).toBeTruthy();
    if (!created) return;
    // Force expire directly in DB
    await prismaX.passwordResetToken.update({
      where: { token: created.token },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const attempt = await consumePasswordResetToken(created.token, "x2");
    expect(attempt.ok).toBe(false);
    expect(attempt.reason).toBe("expired");
  });
});
