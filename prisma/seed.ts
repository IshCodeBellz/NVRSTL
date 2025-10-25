import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // --- Brands ---
  const [tribeWear, urbanForge, aeroMesh, panElite, streetLine] =
    await Promise.all([
      prisma.brand.upsert({
        where: { name: "TribeWear" },
        update: {},
        create: {
          name: "TribeWear",
          description: "Pan-African inspired sportswear",
          isFeatured: true,
          displayOrder: 1,
        },
      }),
      prisma.brand.upsert({
        where: { name: "UrbanForge" },
        update: {},
        create: {
          name: "UrbanForge",
          description: "Urban training & lifestyle",
        },
      }),
      prisma.brand.upsert({
        where: { name: "AeroMesh" },
        update: {},
        create: {
          name: "AeroMesh",
          description: "Breathable performance layers",
        },
      }),
      prisma.brand.upsert({
        where: { name: "PanElite" },
        update: {},
        create: { name: "PanElite", description: "Elite training outerwear" },
      }),
      prisma.brand.upsert({
        where: { name: "StreetLine" },
        update: {},
        create: { name: "StreetLine", description: "Accessories & basics" },
      }),
    ]);

  // --- Categories (simple hierarchy: Men > various) ---
  const men = await prisma.category.upsert({
    where: { slug: "men" },
    update: {},
    create: { slug: "men", name: "Men", description: "Menswear" },
  });

  const cat = async (slug: string, name: string, parentId?: string) =>
    prisma.category.upsert({
      where: { slug },
      update: {},
      create: { slug, name, parentId },
    });

  const [
    menJerseys,
    menTracksuits,
    menTops,
    menShorts,
    menOuterwear,
    menHoodies,
    menBaselayers,
    menLeggings,
    accessories,
    socks,
  ] = await Promise.all([
    cat("men-jerseys", "Jerseys", men.id),
    cat("men-tracksuits", "Tracksuits", men.id),
    cat("men-tops", "Tops & Tees", men.id),
    cat("men-shorts", "Shorts", men.id),
    cat("men-outerwear", "Outerwear", men.id),
    cat("men-hoodies", "Hoodies", men.id),
    cat("men-baselayers", "Baselayers", men.id),
    cat("men-leggings", "Leggings & Tights", men.id),
    cat("accessories", "Accessories"),
    cat("socks", "Socks"),
  ]);

  // Helper for jersey config
  const jerseyCfg = (extras?: object) => ({
    patches: ["AFCON", "CaptainsBand", "None"],
    sleeveAds: ["None", "SponsorA"],
    fonts: ["Block", "Classic"],
    addOns: { nameSet: 800, numberSet: 500, sleevePatch: 300 },
    ...extras,
  });

  // --- 20 Products ---
  const products = [
    {
      sku: "TW-GH-233-001",
      name: "Ghana Mesh Jersey — +233 Black Stars",
      brandId: tribeWear.id,
      categoryId: menJerseys.id,
      gender: "M",
      description:
        "Breathable mesh jersey with faint Adinkra motifs, Black Stars crest, +233 dial code motif.",
      shortDescription: "Customizable Ghana mesh jersey.",
      priceCents: 4999,
      comparePriceCents: 5999,
      isFeatured: true,
      isJersey: true,
      tags: "ghana,+233,black stars,mesh,tribal,jersey",
      jerseyConfig: jerseyCfg({ country: "Ghana", year: 1957 }),
      images: [
        {
          url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop&crop=center",
          alt: "Ghana Jersey Front",
          position: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&crop=center",
          alt: "Ghana Jersey Back",
          position: 1,
        },
      ],
    },
    {
      sku: "TW-NG-234-001",
      name: "Nigeria Naija Wave Jersey — +234",
      brandId: tribeWear.id,
      categoryId: menJerseys.id,
      gender: "M",
      description:
        "Iconic zig-zag wave pattern with eagle crest and +234 dial code integration.",
      shortDescription: "Naija wave mesh jersey.",
      priceCents: 4999,
      comparePriceCents: 6499,
      isJersey: true,
      tags: "nigeria,+234,naija,eagle,jersey",
      jerseyConfig: jerseyCfg({ country: "Nigeria", year: 1960 }),
      images: [
        {
          url: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=800&fit=crop&crop=center",
          alt: "Nigeria Jersey Front",
          position: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&crop=center",
          alt: "Nigeria Jersey Back",
          position: 1,
        },
      ],
    },
    {
      sku: "TW-SN-221-001",
      name: "Senegal Lions Jersey — +221",
      brandId: tribeWear.id,
      categoryId: menJerseys.id,
      gender: "M",
      description:
        "Green trim, tri-color cuffs, lion crest and +221 dial code motif.",
      priceCents: 4799,
      comparePriceCents: 5799,
      isJersey: true,
      tags: "senegal,+221,lions,jersey",
      jerseyConfig: jerseyCfg({ country: "Senegal", year: 1960 }),
      images: [
        {
          url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop&crop=center",
          alt: "Senegal Jersey Front",
          position: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&crop=center",
          alt: "Senegal Jersey Back",
          position: 1,
        },
      ],
    },
    {
      sku: "TW-ZA-027-001",
      name: "South Africa Bafana Jersey — +27",
      brandId: tribeWear.id,
      categoryId: menJerseys.id,
      gender: "M",
      description:
        "Gold base, green shoulders, Bafana Bafana text and +27 dial code.",
      priceCents: 4899,
      comparePriceCents: 5999,
      isJersey: true,
      tags: "south africa,+27,bafana,jersey",
      jerseyConfig: jerseyCfg({ country: "South Africa", year: 1994 }),
      images: [
        {
          url: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=800&fit=crop&crop=center",
          alt: "South Africa Jersey Front",
          position: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&crop=center",
          alt: "South Africa Jersey Back",
          position: 1,
        },
      ],
    },
    {
      sku: "TW-KE-254-001",
      name: "Kenya Harambee Jersey — +254",
      brandId: tribeWear.id,
      categoryId: menJerseys.id,
      gender: "M",
      description:
        "Black-red-green stripes, shield emblem, +254 integrated back number.",
      priceCents: 4699,
      comparePriceCents: 5499,
      isJersey: true,
      tags: "kenya,+254,harambee,jersey",
      jerseyConfig: jerseyCfg({ country: "Kenya", year: 1963 }),
      images: [
        {
          url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop&crop=center",
          alt: "Kenya Jersey Front",
          position: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&crop=center",
          alt: "Kenya Jersey Back",
          position: 1,
        },
      ],
    },
    {
      sku: "TW-EG-020-001",
      name: "Egypt Pharaohs Jersey — +20",
      brandId: tribeWear.id,
      categoryId: menJerseys.id,
      gender: "M",
      description:
        "Deep red body, black cuffs, Pharaoh emblem, +20 number merge.",
      priceCents: 4999,
      comparePriceCents: 5999,
      isJersey: true,
      tags: "egypt,+20,pharaohs,jersey",
      jerseyConfig: jerseyCfg({ country: "Egypt", year: 1922 }),
      images: [
        {
          url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop&crop=center",
          alt: "Egypt Jersey Front",
          position: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&crop=center",
          alt: "Egypt Jersey Back",
          position: 1,
        },
      ],
    },
    {
      sku: "TW-MA-212-001",
      name: "Morocco Atlas Lions Jersey — +212",
      brandId: tribeWear.id,
      categoryId: menJerseys.id,
      gender: "M",
      description: "Emerald base, red chest band, star crest, +212 dial code.",
      priceCents: 5099,
      comparePriceCents: 6199,
      isJersey: true,
      tags: "morocco,+212,atlas lions,jersey",
      jerseyConfig: jerseyCfg({ country: "Morocco", year: 1956 }),
      images: [
        {
          url: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=800&fit=crop&crop=center",
          alt: "Morocco Jersey Front",
          position: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&crop=center",
          alt: "Morocco Jersey Back",
          position: 1,
        },
      ],
    },
    {
      sku: "TW-CI-225-001",
      name: "Ivory Coast Elephants Jersey — +225",
      brandId: tribeWear.id,
      categoryId: menJerseys.id,
      gender: "M",
      description:
        "Orange home kit vibe, elephant crest, +225 integrated number style.",
      priceCents: 4899,
      comparePriceCents: 5899,
      isJersey: true,
      tags: "ivory coast,+225,elephants,jersey",
      jerseyConfig: jerseyCfg({ country: "Côte d’Ivoire", year: 1960 }),
      images: [
        {
          url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop&crop=center",
          alt: "Ivory Coast Jersey Front",
          position: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&crop=center",
          alt: "Ivory Coast Jersey Back",
          position: 1,
        },
      ],
    },
    {
      sku: "TW-CM-237-001",
      name: "Cameroon Indomitable Jersey — +237",
      brandId: tribeWear.id,
      categoryId: menJerseys.id,
      gender: "M",
      description:
        "Green base, red collar, lion badge, bold +237 number merge.",
      priceCents: 4899,
      comparePriceCents: 5899,
      isJersey: true,
      tags: "cameroon,+237,indomitable lions,jersey",
      jerseyConfig: jerseyCfg({ country: "Cameroon", year: 1960 }),
      images: [
        {
          url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop&crop=center",
          alt: "Cameroon Jersey Front",
          position: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&crop=center",
          alt: "Cameroon Jersey Back",
          position: 1,
        },
      ],
    },
    {
      sku: "TW-ET-251-001",
      name: "Ethiopia Walia Jersey — +251",
      brandId: tribeWear.id,
      categoryId: menJerseys.id,
      gender: "M",
      description:
        "Green base with yellow-red patterning, Walia ibex crest, +251 number.",
      priceCents: 4599,
      comparePriceCents: 5399,
      isJersey: true,
      tags: "ethiopia,+251,walia,jersey",
      jerseyConfig: jerseyCfg({ country: "Ethiopia", year: 1941 }),
      images: [
        {
          url: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=800&fit=crop&crop=center",
          alt: "Ethiopia Jersey Front",
          position: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&crop=center",
          alt: "Ethiopia Jersey Back",
          position: 1,
        },
      ],
    },

    // Tracksuits (2)
    {
      sku: "TW-TS-001-BLK",
      name: "TribeWear Classic Tracksuit — Black",
      brandId: tribeWear.id,
      categoryId: menTracksuits.id,
      gender: "M",
      description: "Streamlined fit, soft fleece interior, minimal chest logo.",
      shortDescription: "Classic black tracksuit.",
      priceCents: 6999,
      comparePriceCents: 7999,
      tags: "tracksuit,black,lounge,training",
      images: [
        {
          url: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=800&fit=crop&crop=center",
          alt: "Tracksuit Black",
          position: 0,
        },
      ],
    },
    {
      sku: "TW-TS-002-KHK",
      name: "TribeWear Classic Tracksuit — Khaki",
      brandId: tribeWear.id,
      categoryId: menTracksuits.id,
      gender: "M",
      description: "Khaki green tone with tapered legs and zip pockets.",
      priceCents: 6999,
      comparePriceCents: 7999,
      tags: "tracksuit,khaki,street",
      images: [
        {
          url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop&crop=center",
          alt: "Tracksuit Khaki",
          position: 0,
        },
      ],
    },

    // Tees & Shorts (3)
    {
      sku: "UF-TOP-001",
      name: "UrbanForge Tech Tee",
      brandId: urbanForge.id,
      categoryId: menTops.id,
      gender: "M",
      description: "Lightweight, quick-dry fabric with raglan sleeves.",
      shortDescription: "Performance tech tee.",
      priceCents: 2499,
      comparePriceCents: 2999,
      tags: "tee,training,quick-dry",
      images: [
        {
          url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop&crop=center",
          alt: "Tech Tee",
          position: 0,
        },
      ],
    },
    {
      sku: "UF-SH-001",
      name: "UrbanForge Performance Shorts",
      brandId: urbanForge.id,
      categoryId: menShorts.id,
      gender: "M",
      description: '4-way stretch, 7" inseam, zip pocket.',
      priceCents: 2799,
      comparePriceCents: 3299,
      tags: "shorts,performance,zip-pocket",
      images: [
        {
          url: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=800&fit=crop&crop=center",
          alt: "Performance Shorts",
          position: 0,
        },
      ],
    },
    {
      sku: "UF-TOP-002",
      name: "UrbanForge Longline Tee",
      brandId: urbanForge.id,
      categoryId: menTops.id,
      gender: "M",
      description: "Longline silhouette with dropped hem for layering.",
      priceCents: 2299,
      comparePriceCents: 2799,
      tags: "tee,longline,layering",
      images: [
        {
          url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop&crop=center",
          alt: "Longline Tee",
          position: 0,
        },
      ],
    },

    // Outerwear & Hoodies (2)
    {
      sku: "PE-WB-001",
      name: "PanElite Windbreaker",
      brandId: panElite.id,
      categoryId: menOuterwear.id,
      gender: "M",
      description: "Packable windbreaker with mesh lining and bungee hem.",
      priceCents: 5999,
      comparePriceCents: 7499,
      tags: "windbreaker,outerwear,packable",
      images: [
        {
          url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop&crop=center",
          alt: "Windbreaker",
          position: 0,
        },
      ],
    },
    {
      sku: "PE-HD-001",
      name: "PanElite Training Hoodie",
      brandId: panElite.id,
      categoryId: menHoodies.id,
      gender: "M",
      description: "Mid-weight hoodie, scuba hood, thumbholes.",
      priceCents: 5499,
      comparePriceCents: 6999,
      tags: "hoodie,training,mid-weight",
      images: [
        {
          url: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=800&fit=crop&crop=center",
          alt: "Training Hoodie",
          position: 0,
        },
      ],
    },

    // Accessories & Socks (2)
    {
      sku: "SL-CAP-001",
      name: "StreetLine Curved Cap",
      brandId: streetLine.id,
      categoryId: accessories.id,
      gender: "U",
      description: "Classic 6-panel cap with adjustable strap.",
      priceCents: 1599,
      comparePriceCents: 1999,
      tags: "cap,accessory,street",
      images: [
        {
          url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop&crop=center",
          alt: "Curved Cap",
          position: 0,
        },
      ],
    },
    {
      sku: "SL-SOCK-3PK",
      name: "StreetLine Cushioned Socks — 3 Pack",
      brandId: streetLine.id,
      categoryId: socks.id,
      gender: "U",
      description: "Breathable rib, cushioned heel & toe.",
      priceCents: 1299,
      comparePriceCents: 1699,
      tags: "socks,3-pack,basics",
      images: [
        {
          url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop&crop=center",
          alt: "Socks 3 Pack",
          position: 0,
        },
      ],
    },

    // Baselayer & Leggings (2)
    {
      sku: "AM-BL-001",
      name: "AeroMesh Baselayer Top",
      brandId: aeroMesh.id,
      categoryId: menBaselayers.id,
      gender: "M",
      description: "Ultra-light mesh knit for moisture control.",
      priceCents: 2999,
      comparePriceCents: 3799,
      tags: "baselayer,mesh,performance",
      images: [
        {
          url: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=800&fit=crop&crop=center",
          alt: "Baselayer Top",
          position: 0,
        },
      ],
    },
    {
      sku: "AM-LG-001",
      name: "AeroMesh Compression Tights",
      brandId: aeroMesh.id,
      categoryId: menLeggings.id,
      gender: "M",
      description: "Compression support with flatlock seams.",
      priceCents: 3499,
      comparePriceCents: 4299,
      tags: "leggings,compression,training",
      images: [
        {
          url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop&crop=center",
          alt: "Compression Tights",
          position: 0,
        },
      ],
    },
  ] as const;

  // Create products (with images + optional jerseyConfig)
  for (const p of products) {
    await prisma.product.create({
      data: {
        sku: p.sku,
        name: p.name,
        description: p.description,
        shortDescription: (p as any).shortDescription ?? null,
        priceCents: p.priceCents,
        comparePriceCents: (p as any).comparePriceCents ?? null,
        brandId: p.brandId,
        categoryId: p.categoryId,
        isActive: true,
        isFeatured: (p as any).isFeatured ?? false,
        tags: (p as any).tags ?? null,
        gender: (p as any).gender ?? "U",
        isJersey: (p as any).isJersey ?? false,
        jerseyConfig: (p as any).jerseyConfig ?? null,
        images: p.images ? { create: [...p.images] } : undefined,
        metrics: { create: {} }, // optional but handy for dashboards
        productAnalytics: { create: {} }, // optional analytics row
      },
    });
  }

  console.log("Seeded 20 products ✅");

  // --- Shop Categories and Teams ---
  console.log("🌱 Seeding shop categories and teams...");

  // Create Football category if it doesn't exist
  let footballCategory = await prisma.shopCategory.findFirst({
    where: { slug: "football" },
  });

  if (!footballCategory) {
    footballCategory = await prisma.shopCategory.create({
      data: {
        slug: "football",
        name: "Football",
        description: "Football jerseys and merchandise",
        displayOrder: 0,
      },
    });
    console.log("✅ Created Football category");
  } else {
    console.log("✅ Football category already exists");
  }

  // Create Premier League subcategory if it doesn't exist
  let premierLeague = await prisma.shopSubcategory.findFirst({
    where: {
      slug: "premier-league",
      categoryId: footballCategory.id,
    },
  });

  if (!premierLeague) {
    premierLeague = await prisma.shopSubcategory.create({
      data: {
        categoryId: footballCategory.id,
        slug: "premier-league",
        name: "Premier League",
        description: "Premier League teams and jerseys",
        displayOrder: 0,
      },
    });
    console.log("✅ Created Premier League subcategory");
  } else {
    console.log("✅ Premier League subcategory already exists");
  }

  // Create teams
  const teams = [
    {
      slug: "arsenal",
      name: "Arsenal",
      description: "Official Arsenal FC jerseys, kits, and merchandise",
    },
    {
      slug: "chelsea",
      name: "Chelsea",
      description: "Official Chelsea FC merchandise",
    },
    {
      slug: "liverpool",
      name: "Liverpool",
      description: "Official Liverpool FC merchandise",
    },
    {
      slug: "manchester-united",
      name: "Manchester United",
      description: "Official Manchester United merchandise",
    },
    {
      slug: "tottenham",
      name: "Tottenham",
      description: "Official Tottenham Hotspur merchandise",
    },
  ];

  for (const teamData of teams) {
    const existing = await prisma.shopTeam.findFirst({
      where: {
        slug: teamData.slug,
        subcategoryId: premierLeague.id,
      },
    });

    if (!existing) {
      await prisma.shopTeam.create({
        data: {
          subcategoryId: premierLeague.id,
          slug: teamData.slug,
          name: teamData.name,
          description: teamData.description,
          displayOrder: teams.indexOf(teamData),
        },
      });
      console.log(`✅ Created ${teamData.name} team`);
    } else {
      console.log(`✅ ${teamData.name} team already exists`);
    }
  }

  console.log("🎉 Team seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
