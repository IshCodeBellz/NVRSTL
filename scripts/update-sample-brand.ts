import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateSampleBrand() {
  try {
    // Find a brand to update
    const brand = await prisma.brand.findFirst({
      where: {
        products: {
          some: {
            isActive: true,
            deletedAt: null,
          },
        },
      },
    });

    if (!brand) {
      console.log("No brands found with active products");
      return;
    }

    console.log(`Found brand: ${brand.name}`);

    // Update the brand with sample data
    const updatedBrand = await prisma.brand.update({
      where: { id: brand.id },
      data: {
        logoUrl:
          "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=100&fit=crop&crop=center",
        backgroundImage:
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop&crop=center",
        description: `${brand.name} offers premium quality fashion items with modern designs and exceptional craftsmanship.`,
        isFeatured: true,
        displayOrder: 1,
      },
    });

    console.log("Updated brand:", {
      name: updatedBrand.name,
      logoUrl: updatedBrand.logoUrl,
      backgroundImage: updatedBrand.backgroundImage,
      description: updatedBrand.description,
      isFeatured: updatedBrand.isFeatured,
      displayOrder: updatedBrand.displayOrder,
    });
  } catch (error) {
      console.error("Error:", error);
    console.error("Error updating brand:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSampleBrand();
