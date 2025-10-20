import { SubcategoriesGrid } from "@/components/layout/SubcategoriesGrid";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export default async function AccessoriesPage() {
  // Fetch accessories category and its subcategories from database
  let accessoriesCategory;
  try {
    accessoriesCategory = await prisma.category.findFirst({
      where: { slug: "accessories" },
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
    accessoriesCategory = null;
  }

  const subcategories =
    accessoriesCategory?.children.map((child) => ({
      name: child.name,
      slug: child.slug.replace("accessories-", ""), // Remove prefix for URL
      href: `/accessories/${child.slug.replace("accessories-", "")}`,
      image:
        child.imageUrl ||
        `https://picsum.photos/seed/accessories-${child.slug}/600/800`,
      description: child.description || `${child.name} collection`,
      productCount: child._count.products,
    })) || [];

  return (
    <SubcategoriesGrid title="Accessories" subcategories={subcategories} />
  );
}
