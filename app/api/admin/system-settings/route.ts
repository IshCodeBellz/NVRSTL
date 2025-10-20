import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { logger, withRequest } from "@/lib/server/logger";
import { SystemSettingsService } from "@/lib/server/systemSettingsService";

export const dynamic = "force-dynamic";

async function ensureAdmin() {
  const session = await getServerSession(authOptionsEnhanced);
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.isAdmin) return null;
  return user;
}

// List all system settings (admin only)
export const GET = withRequest(async function GET() {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await SystemSettingsService.getAllSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    logger.error("Error fetching system settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch system settings" },
      { status: 500 }
    );
  }
});

// Upsert a single system setting (admin only)
export const POST = withRequest(async function POST(req: NextRequest) {
  const admin = await ensureAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      key,
      value,
      type,
      category,
      description,
      isPublic,
    }: {
      key: string;
      value: unknown;
      type?: "string" | "number" | "boolean" | "json";
      category?: string;
      description?: string;
      isPublic?: boolean;
    } = body || {};

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Missing key or value" },
        { status: 400 }
      );
    }

    // Determine type to use (explicit or inferred)
    const typeToUse: "string" | "number" | "boolean" | "json" =
      type ||
      (typeof value === "boolean"
        ? "boolean"
        : typeof value === "number"
        ? "number"
        : typeof value === "object"
        ? "json"
        : "string");

    // Infer category if not provided
    const inferredCategory =
      category ||
      (key.startsWith("features.")
        ? "features"
        : key.startsWith("site.")
        ? "site"
        : "general");

    // Validate and cast value according to typeToUse
    let castValue: string | number | boolean | object;
    switch (typeToUse) {
      case "boolean":
        castValue = typeof value === "boolean" ? value : value === "true";
        break;
      case "number":
        castValue = typeof value === "number" ? value : Number(value);
        break;
      case "json":
        castValue =
          typeof value === "object"
            ? value
            : (() => {
                try {
                  return JSON.parse(value as string);
                } catch {
                  return {};
                }
              })();
        break;
      default:
        castValue = String(value);
    }

    const updated = await SystemSettingsService.setSetting(
      key,
      castValue,
      typeToUse,
      inferredCategory,
      admin.email,
      { description, isPublic }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update setting" },
        { status: 500 }
      );
    }

    return NextResponse.json({ setting: updated });
  } catch (error) {
    logger.error("Error updating system setting:", error);
    return NextResponse.json(
      { error: "Failed to update system setting" },
      { status: 500 }
    );
  }
});
