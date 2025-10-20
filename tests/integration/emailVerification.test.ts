import { describe, test, expect, beforeEach } from "@jest/globals";
import { NextRequest } from "next/server";
import { resetDb } from "../helpers/testServer";
import * as requestRoute from "@/app/api/auth/verify-email/request/route";
import * as confirmRoute from "@/app/api/auth/verify-email/confirm/route";
import { prisma } from "@/lib/server/prisma";
import crypto from "crypto";

beforeEach(async () => {
  await resetDb();
});

describe("email verification flow", () => {
  test("successfully requests verification for unverified user", async () => {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        id: "verify-user-1",
        email: "test@example.com",
        passwordHash: "hashed",
        emailVerified: false,
      },
    });

    const req = new NextRequest(
      "http://localhost:3000/api/auth/verify-email/request",
      {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      }
    );

    const res = await requestRoute.POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.message).toBe("Verification email sent successfully");
    expect(data.email).toBe("test@example.com");

    // Verify token was created
    const token = await prisma.emailVerificationToken.findUnique({
      where: { userId: user.id },
    });
    expect(token).toBeTruthy();
    expect(token?.expiresAt).toBeInstanceOf(Date);
    expect(token?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test("returns early success for already verified user", async () => {
    // Create verified user
    await prisma.user.create({
      data: {
        id: "verify-user-2",
        email: "verified@example.com",
        passwordHash: "hashed",
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    const req = new NextRequest(
      "http://localhost:3000/api/auth/verify-email/request",
      {
        method: "POST",
        body: JSON.stringify({ email: "verified@example.com" }),
      }
    );

    const res = await requestRoute.POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.message).toBe("Email is already verified");
    expect(data.verified).toBe(true);
  });

  test("returns 404 for non-existent user", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/auth/verify-email/request",
      {
        method: "POST",
        body: JSON.stringify({ email: "nonexistent@example.com" }),
      }
    );

    const res = await requestRoute.POST(req);
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toBe("NOT_FOUND");
  });

  test("validates email format", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/auth/verify-email/request",
      {
        method: "POST",
        body: JSON.stringify({ email: "invalid-email" }),
      }
    );

    const res = await requestRoute.POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("VALIDATION_ERROR");
  });

  test("successfully confirms valid verification token", async () => {
    // Create user and token
    const user = await prisma.user.create({
      data: {
        id: "verify-user-3",
        email: "confirm@example.com",
        passwordHash: "hashed",
        emailVerified: false,
      },
    });

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    const req = new NextRequest(
      "http://localhost:3000/api/auth/verify-email/confirm",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      }
    );

    const res = await confirmRoute.POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.message).toBe("Email verified successfully");
    expect(data.verified).toBe(true);
    expect(data.user.emailVerified).toBe(true);

    // Verify user was updated
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser?.emailVerified).toBe(true);
    expect(updatedUser?.emailVerifiedAt).toBeInstanceOf(Date);

    // Verify token was marked as used
    const usedToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
    });
    expect(usedToken?.usedAt).toBeInstanceOf(Date);
  });

  test("rejects expired verification token", async () => {
    // Create user and expired token
    const user = await prisma.user.create({
      data: {
        id: "verify-user-4",
        email: "expired@example.com",
        passwordHash: "hashed",
        emailVerified: false,
      },
    });

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      },
    });

    const req = new NextRequest(
      "http://localhost:3000/api/auth/verify-email/confirm",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      }
    );

    const res = await confirmRoute.POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("TOKEN_EXPIRED");
  });

  test("rejects already used verification token", async () => {
    // Create user and used token
    const user = await prisma.user.create({
      data: {
        id: "verify-user-5",
        email: "used@example.com",
        passwordHash: "hashed",
        emailVerified: false,
      },
    });

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usedAt: new Date(), // Already used
      },
    });

    const req = new NextRequest(
      "http://localhost:3000/api/auth/verify-email/confirm",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      }
    );

    const res = await confirmRoute.POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("TOKEN_USED");
  });

  test("rejects invalid verification token", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/auth/verify-email/confirm",
      {
        method: "POST",
        body: JSON.stringify({ token: "invalid-token" }),
      }
    );

    const res = await confirmRoute.POST(req);
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toBe("NOT_FOUND");
  });

  test("handles already verified user gracefully", async () => {
    // Create already verified user
    const user = await prisma.user.create({
      data: {
        id: "verify-user-6",
        email: "already@example.com",
        passwordHash: "hashed",
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const req = new NextRequest(
      "http://localhost:3000/api/auth/verify-email/confirm",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      }
    );

    const res = await confirmRoute.POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.message).toBe("Email is already verified");
    expect(data.verified).toBe(true);

    // Verify token was still marked as used
    const usedToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
    });
    expect(usedToken?.usedAt).toBeInstanceOf(Date);
  });

  test("upserts verification token on multiple requests", async () => {
    // Create user
    const user = await prisma.user.create({
      data: {
        id: "verify-user-7",
        email: "upsert@example.com",
        passwordHash: "hashed",
        emailVerified: false,
      },
    });

    // First request
    const req1 = new NextRequest(
      "http://localhost:3000/api/auth/verify-email/request",
      {
        method: "POST",
        body: JSON.stringify({ email: "upsert@example.com" }),
      }
    );

    const res1 = await requestRoute.POST(req1);
    expect(res1.status).toBe(200);

    const firstToken = await prisma.emailVerificationToken.findUnique({
      where: { userId: user.id },
    });
    expect(firstToken).toBeTruthy();

    // Wait to avoid Resend rate limit (2 req/sec)
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Second request should update the existing token
    const req2 = new NextRequest(
      "http://localhost:3000/api/auth/verify-email/request",
      {
        method: "POST",
        body: JSON.stringify({ email: "upsert@example.com" }),
      }
    );

    const res2 = await requestRoute.POST(req2);
    expect(res2.status).toBe(200);

    const secondToken = await prisma.emailVerificationToken.findUnique({
      where: { userId: user.id },
    });
    expect(secondToken).toBeTruthy();
    expect(secondToken?.token).not.toBe(firstToken?.token); // New token generated
    expect(secondToken?.createdAt.getTime()).toBeGreaterThanOrEqual(
      firstToken?.createdAt.getTime() || 0
    );
  });
});
