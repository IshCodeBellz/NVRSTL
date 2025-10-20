import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { hashPassword } from "@/lib/server/auth";
import { ExtendedSession } from "@/lib/types";
import { error as logError } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = (await getServerSession(
    authOptionsEnhanced
  )) as ExtendedSession | null;
  const uid = session?.user?.id;
  if (!uid)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: uid },
    });

    if (!user) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    // Get user preferences separately (if table exists)
    const preferences = null;
    try {
      // UserPreferences model may not exist in schema yet
      // preferences = await prisma.userPreferences?.findUnique({
      //   where: { userId: uid },
      // });
    } catch {
      // Preferences not found or error - this is expected if UserPreferences model doesn't exist yet
    }

    return NextResponse.json({
      ...user,
      preferences,
    });
  } catch (error) {
    logError("profile_fetch_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(
    authOptionsEnhanced
  )) as ExtendedSession | null;
  const uid = session?.user?.id;
  if (!uid)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  try {
    // Default to update_profile when no explicit action provided
    const action = body.action || "update_profile";

    // Handle comprehensive profile update
    if (action === "update_profile") {
      const updateData: Record<string, string | Date | null> = {};

      // Handle name field
      if (typeof body.name === "string") {
        updateData.name = body.name.trim().slice(0, 100) || null;
      }

      // Handle firstName and lastName
      if (typeof body.firstName === "string") {
        updateData.firstName = body.firstName.trim().slice(0, 50) || null;
      }
      if (typeof body.lastName === "string") {
        updateData.lastName = body.lastName.trim().slice(0, 50) || null;
      }

      // Handle date of birth
      if (body.dateOfBirth) {
        try {
          updateData.dateOfBirth = new Date(body.dateOfBirth);
        } catch {
          return NextResponse.json(
            { error: "Invalid date of birth format" },
            { status: 400 }
          );
        }
      }

      // Handle gender
      if (typeof body.gender === "string") {
        updateData.gender = body.gender.trim().slice(0, 50) || null;
      }

      await prisma.user.update({
        where: { id: uid },
        data: updateData,
      });
      return NextResponse.json({ ok: true });
    }

    // Handle password update
    if (action === "update_password") {
      const { newPassword } = body;
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }

      const hashedPassword = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id: uid },
        data: { passwordHash: hashedPassword },
      });
      return NextResponse.json({ ok: true });
    }

    // Handle contact preferences update
    if (action === "update_preferences") {
      const { contactPreferences } = body;
      if (!contactPreferences || typeof contactPreferences !== "object") {
        return NextResponse.json(
          { error: "Invalid contact preferences" },
          { status: 400 }
        );
      }

      // Upsert user preferences in the database
      await prisma.userPreferences.upsert({
        where: { userId: uid },
        update: {
          emailMarketing: !!contactPreferences.email,
          postMarketing: !!contactPreferences.post,
          smsMarketing: !!contactPreferences.sms,
          thirdParty: !!contactPreferences.thirdParty,
        },
        create: {
          userId: uid,
          emailMarketing: !!contactPreferences.email,
          postMarketing: !!contactPreferences.post,
          smsMarketing: !!contactPreferences.sms,
          thirdParty: !!contactPreferences.thirdParty,
        },
      });
      return NextResponse.json({ ok: true });
    }

    // Handle account deletion
    if (action === "delete_account") {
      // Delete user and all related data
      await prisma.user.delete({
        where: { id: uid },
      });
      return NextResponse.json({
        ok: true,
        message: "Account deleted successfully",
      });
    }

    // If we reached here, the action is not supported
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  } catch (error) {
    logError("profile_update_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
