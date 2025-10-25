import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    console.log("🔍 Debug: Testing shop categories API...");

    // Test 1: Check if table exists
    const count = await prisma.shopCategory.count();
    console.log(`✅ ShopCategory table exists with ${count} records`);

    // Test 2: Try to fetch all categories
    const categories = await prisma.shopCategory.findMany({
      take: 5, // Limit to 5 for testing
    });
    console.log(`✅ Found ${categories.length} categories`);

    return NextResponse.json({
      success: true,
      count,
      categories,
      message: "Shop categories API is working",
    });
  } catch (error) {
    console.error("❌ Debug: Shop categories API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: "Shop categories API failed",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 Debug: Testing shop category creation...");

    const body = await request.json();
    console.log("📝 Request body:", body);

    const { slug, name, description, imageUrl, displayOrder } = body;

    if (!slug || !name) {
      return NextResponse.json(
        {
          success: false,
          error: "Slug and name are required",
        },
        { status: 400 }
      );
    }

    // Test creation
    const category = await prisma.shopCategory.create({
      data: {
        slug: slug + "-debug-" + Date.now(),
        name: name + " (Debug)",
        description: description || "Debug test category",
        imageUrl: imageUrl || null,
        displayOrder: displayOrder || 0,
      },
    });

    console.log("✅ Successfully created debug category:", category.id);

    return NextResponse.json({
      success: true,
      category,
      message: "Debug category created successfully",
    });
  } catch (error) {
    console.error("❌ Debug: Shop category creation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: "Debug category creation failed",
      },
      { status: 500 }
    );
  }
}
