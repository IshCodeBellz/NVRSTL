import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/server/rateLimit";
import {
  createPasswordResetToken,
  sendPasswordResetEmail,
} from "@/lib/server/passwordReset";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const bypass =
    process.env.NODE_ENV === "test" &&
    req.headers.get("x-test-bypass-rate-limit") === "1";
  if (!bypass && !rateLimit(`pwreset:${ip}`, 5, 10 * 60_000)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429 }
    );
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { ok: false, error: "invalid_payload" },
      { status: 400 }
    );
  const { email } = parsed.data;
  const created = await createPasswordResetToken(email);
  if (created) {
    // Fire and forget but we await so tests can assert
    await sendPasswordResetEmail(email, created.token);
  }
  // Always respond success to avoid user enumeration
  return NextResponse.json({ ok: true });
}
