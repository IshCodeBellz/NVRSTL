import { PrismaClient } from "@prisma/client";

/**
 * Generates 120 additional random products (idempotent by SKU prefix RAND-####) without touching curated or AUTO items.
 * If some RAND-* already exist, it only creates the missing amount up to 120.
 */
const prisma = new PrismaClient();

const BRAND_FALLBACKS = [
  "Nova",
  "Axis",
  "Prime",
  "Zen",
  "Core",
  "Aether",
  "Momentum",
];
const CATEGORY_SLUGS = [
  "women",
  "men",
  "clothing",
  "shoes",
  "accessories",
  "sportswear",
  "face-body",
  "new-in",
];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function uniqueSeed(i: number) {
  return `rand-${i}-${Date.now().toString(36)}`;
}

async function ensureBaseTaxonomy() {
  // Ensure there is at least one of each brand & category from fallback arrays
  await Promise.all(
    BRAND_FALLBACKS.map((name) =>
      prisma.brand.upsert({ where: { name }, update: {}, create: { name } })
    )
  );
  await Promise.all(
    CATEGORY_SLUGS.map((slug) =>
      prisma.category.upsert({
        where: { slug },
        update: {},
        create: {
          slug,
          name: slug
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
        },
      })
    )
  );
  const brands = await prisma.brand.findMany({
    where: { name: { in: BRAND_FALLBACKS } },
  });
  const categories = await prisma.category.findMany({
    where: { slug: { in: CATEGORY_SLUGS } },
  });
  return { brands, categories };
}

async function main() {
  const TARGET = 120;
  const existing = await prisma.product.count({
    where: { sku: { startsWith: "RAND-" } },
  });
  const remaining = Math.max(0, TARGET - existing);
  if (remaining === 0) {
    console.log(`Already have ${existing} RAND-* products. Nothing to do.`);
    return;
  }
  const { brands, categories } = await ensureBaseTaxonomy();
  console.log(
    `Creating ${remaining} random products (currently ${existing} exist).`
  );

  const letterSizes = ["XS", "S", "M", "L", "XL"];
  const shoeSizes = ["6", "7", "8", "9", "10", "11", "12"];
  for (let i = 0; i < remaining; i++) {
    const index = existing + i + 1;
    const brand = pick(brands);
    const category = pick(categories);
    const isShoes = category.slug === "shoes";
    const isAccessory = category.slug === "accessories";
    const sizes = isShoes
      ? shoeSizes.slice(0, randInt(3, 7))
      : isAccessory
      ? ["ONE"]
      : letterSizes.slice(0, randInt(3, 5));
    const baseName = `${category.name} Random ${index}`;
    const price = randInt(15, 130); // sensible apparel price range
    const sku = `RAND-${String(index).padStart(4, "0")}`;
    await prisma.product.create({
      data: {
        sku,
        name: baseName,
        description: `${baseName} auto-generated product used for testing lists, trending, and performance.`,
        priceCents: price * 100,
        brandId: brand.id,
        categoryId: category.id,
        images: {
          create: [0, 1].map((p) => ({
            url: `https://picsum.photos/seed/${uniqueSeed(
              index
            )}-${p}/900/1200`,
            position: p,
            alt: `${baseName} image ${p + 1}`,
          })),
        },
        sizeVariants: {
          create: sizes.map((label, sIdx) => ({
            label,
            stock: randInt(15, 120) - sIdx * 2,
          })),
        },
      },
    });
    if ((i + 1) % 25 === 0) console.log(`  ...created ${i + 1}/${remaining}`);
  }
  console.log(
    `Random product generation complete. Total RAND-* now: ${await prisma.product.count(
      { where: { sku: { startsWith: "RAND-" } } }
    )}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
