import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check if we're in production
    const isProduction = process.env.NODE_ENV === "production";

    // Check database connection
    let dbStatus = "unknown";
    try {
      const { prisma } = await import("@/lib/server/prisma");
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = "connected";
    } catch (error) {
      dbStatus = "error";
      console.error("Database connection error:", error);
    }

    // Check environment variables
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? "set" : "missing",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "set" : "missing",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? "set" : "missing",
    };

    return NextResponse.json({
      status: "ok",
      isProduction,
      dbStatus,
      envCheck,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
