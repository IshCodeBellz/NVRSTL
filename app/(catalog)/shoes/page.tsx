import { SubcategoriesGrid } from "@/components/layout/SubcategoriesGrid";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export default async function ShoesPage() {
  // Fetch shoes category and its subcategories from database
  let shoesCategory;
  try {
    shoesCategory = await prisma.category.findFirst({
      where: { slug: "shoes" },
      include: {
        children: {
          where: { isActive: true },
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
          include: {
            _count: {
              select: { products: true },
            },
          },
        },
      },
    });
  } catch {
    shoesCategory = null;
  }

  const subcategories =
    shoesCategory?.children.map((child) => ({
      name: child.name,
      slug: child.slug.replace("shoes-", ""), // Remove prefix for URL
      href: `/shoes/${child.slug.replace("shoes-", "")}`,
      image:
        child.imageUrl ||
        `https://picsum.photos/seed/shoes-${child.slug}/600/800`,
      description: child.description || `${child.name} collection`,
      productCount: child._count.products,
    })) || [];

  return <SubcategoriesGrid title="Footwear" subcategories={subcategories} />;
}
