import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced as authOptions } from "@/lib/server/authOptionsEnhanced";

// Create a new content section
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      pageId,
      type,
      title,
      subtitle,
      content,
      imageUrl,
      buttonText,
      buttonLink,
      order,
      isVisible,
    } = body;

    const section = await prisma.contentSection.create({
      data: {
        pageId,
        type: type || "text",
        title,
        subtitle,
        content: content || "",
        imageUrl,
        buttonText,
        buttonLink,
        order: order || 0,
        isVisible: isVisible !== false,
      },
    });

    return NextResponse.json({ section });
  } catch (error) {
    console.error("Error creating content section:", error);
    return NextResponse.json(
      { error: "Failed to create content section" },
      { status: 500 }
    );
  }
}
