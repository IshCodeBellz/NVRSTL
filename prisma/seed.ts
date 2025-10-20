import { PrismaClient } from "@prisma/client";

/**
 * Seed strategy
 * 1. Idempotently upsert a core set of brands & categories.
 * 2. Insert a curated catalogue of ~20 realistic products with images & size variants.
 * 3. Optional: if env BULK_DEMO=1 also generate additional filler products for pagination / perf testing.
 */
const prisma = new PrismaClient();

async function main() {
  const brandNames = [
    "Nova",
    "Axis",
    "Prime",
    "Zen",
    "Core",
    "Aether",
    "Momentum",
  ];
  const categoryDefs = [
    { slug: "women", name: "Women" },
    { slug: "men", name: "Men" },
    { slug: "clothing", name: "Clothing" },
    { slug: "shoes", name: "Shoes" },
    { slug: "accessories", name: "Accessories" },
    { slug: "sportswear", name: "Sportswear" },
    { slug: "face-body", name: "Face + Body" },
    { slug: "new-in", name: "New In" },
  ];

  const brands = await Promise.all(
    brandNames.map((name) =>
      prisma.brand.upsert({ where: { name }, update: {}, create: { name } })
    )
  );
  const categories = await Promise.all(
    categoryDefs.map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        update: { name: c.name },
        create: { slug: c.slug, name: c.name },
      })
    )
  );

  const existingCount = await prisma.product.count();
  if (existingCount > 0) {
    console.log(
      `Products already present (${existingCount}). Ensuring curated catalogue is present (idempotent upserts).`
    );
  }

  // Curated product definitions (always ensure these SKUs exist)
  const curated: Array<{
    sku: string;
    name: string;
    desc: string;
    price: number; // dollars
    categorySlug: string;
    brandName: string;
    images: string[];
    sizes: string[];
  }> = [
    {
      sku: "FB-SERUM-NOVA-000",
      name: "Nova Hydrating Face Serum",
      desc: "Lightweight daily serum with hyaluronic acid and vitamin B5 for deep hydration.",
      price: 28,
      categorySlug: "face-body",
      brandName: "Nova",
      images: ["nova-serum-front", "nova-serum-dropper"],
      sizes: ["30ml"],
    },
    {
      sku: "TEE-BASIC-WHT-001",
      name: "Essential Cotton Tee - White",
      desc: "Ultra-soft 180gsm combed cotton tee with a classic crew neckline.",
      price: 18,
      categorySlug: "clothing",
      brandName: "Core",
      images: ["tee-white-front", "tee-white-back"],
      sizes: ["XS", "S", "M", "L", "XL"],
    },
    {
      sku: "HDY-FLC-BLK-002",
      name: "Fleece Pullover Hoodie - Black",
      desc: "Midweight brushed fleece with kangaroo pocket and metal tipped drawcords.",
      price: 55,
      categorySlug: "clothing",
      brandName: "Nova",
      images: ["hoodie-black-front", "hoodie-black-detail"],
      sizes: ["S", "M", "L", "XL"],
    },
    {
      sku: "SNK-RUN-PRIME-003",
      name: "Prime Runner Sneaker",
      desc: "Responsive foam midsole, engineered mesh upper for breathable daily miles.",
      price: 96,
      categorySlug: "shoes",
      brandName: "Prime",
      images: ["prime-runner-angle", "prime-runner-top"],
      sizes: ["7", "8", "9", "10", "11", "12"],
    },
    {
      sku: "JKT-LITE-ZEN-004",
      name: "Zen Lightweight Wind Jacket",
      desc: "Packable wind-resistant shell with DWR finish and ventilated back yoke.",
      price: 72,
      categorySlug: "sportswear",
      brandName: "Zen",
      images: ["zen-windjacket-front", "zen-windjacket-pack"],
      sizes: ["S", "M", "L", "XL"],
    },
    {
      sku: "BAG-XBODY-AXIS-005",
      name: "Axis Crossbody Tech Bag",
      desc: "Water-resistant recycled nylon with padded phone sleeve and cable loop.",
      price: 38,
      categorySlug: "accessories",
      brandName: "Axis",
      images: ["axis-crossbody-front", "axis-crossbody-open"],
      sizes: ["ONE"],
    },
    {
      sku: "CAP-6P-MOM-006",
      name: "Momentum 6-Panel Cap",
      desc: "Washed cotton twill cap with adjustable metal clasp and embroidered logo.",
      price: 22,
      categorySlug: "accessories",
      brandName: "Momentum",
      images: ["momentum-cap-front", "momentum-cap-back"],
      sizes: ["ONE"],
    },
    {
      sku: "TRK-PANT-AETHER-007",
      name: "Aether Tapered Track Pant",
      desc: "Four‑way stretch moisture-wicking knit with zip ankle gussets.",
      price: 64,
      categorySlug: "sportswear",
      brandName: "Aether",
      images: ["aether-trackpant-full", "aether-trackpant-detail"],
      sizes: ["XS", "S", "M", "L", "XL"],
    },
    {
      sku: "DRS-SLIP-NOVA-008",
      name: "Nova Satin Slip Dress",
      desc: "Bias-cut midi slip in washable stretch satin with adjustable straps.",
      price: 88,
      categorySlug: "women",
      brandName: "Nova",
      images: ["nova-slipdress-front", "nova-slipdress-detail"],
      sizes: ["XS", "S", "M", "L"],
    },
    {
      sku: "SHR-CHINO-CORE-009",
      name: "Core Modern Chino Short",
      desc: "Garment-dyed stretch twill short with enzyme wash for softness.",
      price: 42,
      categorySlug: "men",
      brandName: "Core",
      images: ["core-chino-short-front", "core-chino-short-back"],
      sizes: ["28", "30", "32", "34", "36"],
    },
    {
      sku: "BRT-ATH-PRIME-010",
      name: "Prime Athletic Breathable Tee",
      desc: "Laser-cut ventilation zones and silver ion anti-odor treatment.",
      price: 34,
      categorySlug: "sportswear",
      brandName: "Prime",
      images: ["prime-athtee-front", "prime-athtee-vent"],
      sizes: ["S", "M", "L", "XL"],
    },
  ];

  for (let i = 0; i < curated.length; i++) {
    const c = curated[i];
    const brand = brands.find((b) => b.name === c.brandName)!;
    const category = categories.find((cat) => cat.slug === c.categorySlug)!;
    // Check by SKU
    const existing = await prisma.product.findUnique({ where: { sku: c.sku } });
    if (existing) {
      // Could enhance with update diff if needed
      continue;
    }
    const gender =
      c.categorySlug === "women"
        ? "women"
        : c.categorySlug === "men"
        ? "men"
        : "unisex";
    await prisma.product.create({
      data: {
        sku: c.sku,
        name: c.name,
        description: c.desc,
        priceCents: Math.round(c.price * 100),
        brandId: brand.id,
        categoryId: category.id,
        gender,
        images: {
          create: c.images.map((seed, idx) => ({
            url: `https://picsum.photos/seed/${seed}/900/1200`,
            position: idx,
            alt: `${c.name} image ${idx + 1}`,
          })),
        },
        sizeVariants: {
          create: c.sizes.map((label) => ({
            label,
            stock: 25 + ((label.length * 7 + i * 3) % 60),
          })),
        },
      },
    });
  }
  console.log(
    `Curated catalogue ensured (total now: ${await prisma.product.count()}).`
  );

  // Ensure 100 additional assorted products spread across categories (idempotent by SKU)
  const EXTRA_TARGET = 100; // number of extra (non-curated) products to add
  const currentTotalAfterCurated = await prisma.product.count();
  // Count how many AUTO products already exist (if seed re-run)
  const existingAuto = await prisma.product.count({
    where: { sku: { startsWith: "AUTO-" } },
  });
  const remainingToCreate = Math.max(0, EXTRA_TARGET - existingAuto);
  if (remainingToCreate === 0) {
    console.log(
      `Extra AUTO products already present (${existingAuto}). Skipping additional generation.`
    );
  } else {
    console.log(`Creating ${remainingToCreate} additional products (AUTO-*).`);
    // Re-fetch categories mapping for quick access
    const catMap = Object.fromEntries(categories.map((c) => [c.slug, c]));
    const categoryOrder = [
      "women",
      "men",
      "clothing",
      "shoes",
      "accessories",
      "sportswear",
      "face-body",
      "new-in",
    ];
    const letterSizes = ["XS", "S", "M", "L", "XL"];
    const shoeSizes = ["6", "7", "8", "9", "10", "11", "12"]; // simplified
    for (let i = 0; i < remainingToCreate; i++) {
      const globalIndex = existingAuto + i + 1; // for SKU numbering continuity
      const categorySlug = categoryOrder[i % categoryOrder.length];
      const category = catMap[categorySlug];
      const brand = brands[(i + 3) % brands.length];
      const sku = `AUTO-${String(globalIndex).padStart(4, "0")}`;
      const baseName = category.name;
      const priceBase = 20 + (i % 55); // 20 - 74
      const sizes =
        categorySlug === "shoes"
          ? shoeSizes.slice(0, 4 + (i % 3))
          : categorySlug === "accessories"
          ? ["ONE"]
          : letterSizes.slice(0, 3 + (i % 3));
      const gender =
        categorySlug === "women"
          ? "women"
          : categorySlug === "men"
          ? "men"
          : "unisex";
      await prisma.product.create({
        data: {
          sku,
          name: `${baseName} Item ${globalIndex}`,
          description: `${baseName} collection piece auto-generated for demo listing & pagination scenarios.`,
          priceCents: priceBase * 100,
          brandId: brand.id,
          categoryId: category.id,
          gender,
          images: {
            create: [
              {
                url: `https://picsum.photos/seed/auto-${globalIndex}-1/900/1200`,
                position: 0,
                alt: `${baseName} item ${globalIndex} primary image`,
              },
              {
                url: `https://picsum.photos/seed/auto-${globalIndex}-2/900/1200`,
                position: 1,
                alt: `${baseName} item ${globalIndex} secondary image`,
              },
            ],
          },
          sizeVariants: {
            create: sizes.map((label, sIdx) => ({
              label,
              stock: 30 + ((globalIndex + sIdx * 5) % 70),
            })),
          },
        },
      });
      if ((i + 1) % 20 === 0) {
        console.log(
          `  ...created ${i + 1}/${remainingToCreate} extra products`
        );
      }
    }
    console.log(
      `Extra products complete. Total products: ${await prisma.product.count()}`
    );
  }

  // Optional bulk generation for demos / pagination tests
  if (process.env.BULK_DEMO === "1") {
    const current = await prisma.product.count();
    const targetExtra = 100; // add 100 more
    const sizesPool = ["XS", "S", "M", "L", "XL"];
    for (let i = 0; i < targetExtra; i++) {
      const brand = brands[i % brands.length];
      const category = categories[i % categories.length];
      const gender =
        category.slug === "women"
          ? "women"
          : category.slug === "men"
          ? "men"
          : "unisex";
      await prisma.product.create({
        data: {
          sku: `BULK-${current + i + 1}`,
          name: `Bulk Product ${i + 1}`,
          description: "Auto-generated bulk product for demo pagination.",
          priceCents: 1500 + (i % 80) * 100,
          brandId: brand.id,
          categoryId: category.id,
          gender,
          images: {
            create: [
              {
                url: `https://picsum.photos/seed/bulk-${i}/900/1200`,
                position: 0,
                alt: `Bulk product ${i + 1}`,
              },
            ],
          },
          sizeVariants: {
            create: sizesPool
              .slice(0, (i % sizesPool.length) + 1)
              .map((label) => ({
                label,
                stock: 40 + ((i + label.length) % 40),
              })),
          },
        },
      });
      if ((i + 1) % 25 === 0) console.log(`Bulk: ${i + 1}/${targetExtra}`);
    }
    console.log("Bulk generation complete.");
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
