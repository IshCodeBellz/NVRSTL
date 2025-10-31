import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

// GET /api/auth/mfa/status?email=...
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "missing_email" }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true, mfaEnabled: true } });
  // Do not leak presence of account beyond boolean; still returns false when not found
  return NextResponse.json({ mfaEnabled: !!user?.mfaEnabled });
}


