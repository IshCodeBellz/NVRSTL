import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

// Simple diagnostic to confirm DB contents & presence of 'hat'
export async function GET() {
  try {
    const total = await prisma.product.count({ where: { deletedAt: null } });
    let hatLike = await prisma.product.findFirst({
      where: {
        deletedAt: null,
        name: { contains: "hat" },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        priceCents: true,
        createdAt: true,
      },
    });
    // If not found (case sensitivity), pull a few and filter in JS for debug
    if (!hatLike) {
      const few = await prisma.product.findMany({
        where: { deletedAt: null },
        take: 50,
        select: {
          id: true,
          name: true,
          sku: true,
          priceCents: true,
          createdAt: true,
        },
      });
      const found = few.find((p) => p.name.toLowerCase().includes("hat"));
      hatLike = found || null;
    }
    const randomSample = await prisma.product.findMany({
      where: { deletedAt: null },
      take: 3,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, sku: true },
    });
    return NextResponse.json({
      ok: true,
      databaseUrl: process.env.DATABASE_URL,
      total,
      hatLike,
      sample: randomSample,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        databaseUrl: process.env.DATABASE_URL,
      },
      { status: 500 }
    );
  }
}
