import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced as authOptions } from "@/lib/server/authOptionsEnhanced";

// Get a specific content section
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const section = await prisma.contentSection.findUnique({
      where: { id: params.id },
    });

    if (!section) {
      return NextResponse.json(
        { error: "Content section not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ section });
  } catch (error) {
    console.error("Error fetching content section:", error);
    return NextResponse.json(
      { error: "Failed to fetch content section" },
      { status: 500 }
    );
  }
}

// Update a content section
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
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

    const section = await prisma.contentSection.update({
      where: { id: params.id },
      data: {
        type,
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
    console.error("Error updating content section:", error);
    return NextResponse.json(
      { error: "Failed to update content section" },
      { status: 500 }
    );
  }
}

// Delete a content section
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.contentSection.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting content section:", error);
    return NextResponse.json(
      { error: "Failed to delete content section" },
      { status: 500 }
    );
  }
}
