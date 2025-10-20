import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      images: { orderBy: { position: "asc" } },
      sizeVariants: true,
      brand: true,
      category: true,
    },
  });
  if (!product)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    id: product.id,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    price: product.priceCents / 100, // legacy
    images: product.images.map((im) => ({ url: im.url, alt: im.alt })),
    sizes: product.sizeVariants.map((s) => ({
      label: s.label,
      stock: s.stock,
    })),
    brand: product.brand?.name,
    category: product.category?.slug,
  });
}
