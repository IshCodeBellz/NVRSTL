import { prisma } from "@/lib/server/prisma";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";

// Directly exercise authOptionsEnhanced callbacks to raise function + branch coverage.
// We avoid next-auth runtime; we just call the callbacks with crafted params.

describe("authOptionsEnhanced callbacks", () => {
  test("jwt callback sets uid and isAdmin from user object", async () => {
    const user: any = { id: "cb-user-1", isAdmin: true };
    const token: any = {};
    const out = await (authOptionsEnhanced as any).callbacks.jwt({
      token,
      user,
    });
    expect(out.uid).toBe("cb-user-1");
    expect(out.isAdmin).toBe(true);
  });

  test("jwt lazy loads isAdmin when missing on existing token", async () => {
    const unique =
      "lazy-" + Math.random().toString(36).slice(2, 8) + "@example.com";
    const u = await prisma.user.create({
      data: {
        id: "lazy-user-" + Date.now(),
        email: unique,
        passwordHash: "x",
        isAdmin: false,
      },
    });
    const first: any = { uid: u.id }; // simulate prior session where isAdmin absent
    const out = await (authOptionsEnhanced as any).callbacks.jwt({
      token: first,
      user: undefined,
    });
    expect(out.isAdmin).toBe(false);
  });

  test("session callback injects id and isAdmin", async () => {
    const token: any = { uid: "tok-user", isAdmin: true };
    const session: any = { user: {} };
    const out = await (authOptionsEnhanced as any).callbacks.session({
      session,
      token,
    });
    expect(out.user.id).toBe("tok-user");
    expect(out.user.isAdmin).toBe(true);
  });
});
