import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function addSecondFeaturedBrand() {
  try {
    // Update Zara to be featured with custom styling
    const updatedBrand = await prisma.brand.update({
      where: { name: "Zara" },
      data: {
        logoUrl:
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=100&fit=crop&crop=center",
        backgroundImage:
          "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=400&fit=crop&crop=center",
        description:
          "Zara brings the latest fashion trends with affordable luxury and contemporary styles for the modern wardrobe.",
        isFeatured: true,
        displayOrder: 2,
      },
    });

    console.log("Successfully updated Zara:", updatedBrand);
  } catch (error) {
      console.error("Error:", error);
    console.error("Error updating Zara:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addSecondFeaturedBrand();
