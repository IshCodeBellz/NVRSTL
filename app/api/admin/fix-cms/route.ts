import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function POST(req: NextRequest) {
  try {
    // Simple auth check - you can enhance this
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET || "admin-fix-cms"}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔧 Running CMS database fix...");

    // Check if tables exist
    try {
      await prisma.categorySection.findMany({ take: 1 });
      await prisma.categoryCard.findMany({ take: 1 });
      await prisma.siteSettings.findMany({ take: 1 });
      console.log("✅ CMS tables exist");
    } catch (error) {
      console.error("❌ CMS tables missing:", error);
      return NextResponse.json(
        { 
          error: "CMS tables missing", 
          message: "Run database migrations first: npx prisma migrate deploy" 
        },
        { status: 500 }
      );
    }

    // Initialize default site settings for homepage images
    const defaultSettings = [
      { key: 'heroImageLeft', value: 'https://picsum.photos/900/1200', type: 'text', description: 'Left hero image URL' },
      { key: 'heroImageRight', value: 'https://picsum.photos/901/1200', type: 'text', description: 'Right hero image URL' },
      { key: 'heroLayout', value: 'two-image', type: 'text', description: 'Hero layout type' },
      { key: 'categoryImageDenim', value: 'https://picsum.photos/400/300', type: 'text', description: 'Denim category image' },
      { key: 'categoryImageTops', value: 'https://picsum.photos/401/300', type: 'text', description: 'Tops category image' },
      { key: 'categoryImageShoes', value: 'https://picsum.photos/402/300', type: 'text', description: 'Shoes category image' },
      { key: 'categoryImageAccessories', value: 'https://picsum.photos/403/300', type: 'text', description: 'Accessories category image' },
      { key: 'leagueTitle', value: 'NVRSTL', type: 'text', description: 'League title' },
    ];

    for (const setting of defaultSettings) {
      await prisma.siteSettings.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: {
          key: setting.key,
          value: setting.value,
          type: setting.type,
          description: setting.description,
        }
      });
    }

    console.log("✅ Initialized site settings");

    // Check if we have category sections
    const existingSections = await prisma.categorySection.count();
    
    if (existingSections === 0) {
      console.log("📝 Creating default category sections...");
      
      // Create Services section
      const servicesSection = await prisma.categorySection.create({
        data: {
          title: 'Services',
          slug: 'services',
          description: 'Our core service categories',
          displayOrder: 0,
        }
      });
      
      // Create The Reason section
      const reasonSection = await prisma.categorySection.create({
        data: {
          title: 'The Reason',
          slug: 'the-reason',
          description: 'Why choose us',
          displayOrder: 1,
        }
      });
      
      // Create cards for Services section
      const servicesCards = [
        { title: 'Jerseys', slug: 'jerseys', displayOrder: 0 },
        { title: 'Athletic', slug: 'athletic', displayOrder: 1 },
        { title: 'Casual', slug: 'casual', displayOrder: 2 },
        { title: 'Formal', slug: 'formal', displayOrder: 3 },
        { title: 'Streetwear', slug: 'streetwear', displayOrder: 4 },
        { title: 'Vintage', slug: 'vintage', displayOrder: 5 },
      ];
      
      for (const card of servicesCards) {
        await prisma.categoryCard.create({
          data: {
            sectionId: servicesSection.id,
            title: card.title,
            slug: card.slug,
            displayOrder: card.displayOrder,
          }
        });
      }
      
      // Create cards for The Reason section
      const reasonCards = [
        { title: 'Limited Edition', slug: 'limited', displayOrder: 0 },
        { title: 'Exclusive', slug: 'exclusive', displayOrder: 1 },
        { title: 'Premium', slug: 'premium', displayOrder: 2 },
        { title: 'Sustainable', slug: 'sustainable', displayOrder: 3 },
        { title: 'Artisan', slug: 'artisan', displayOrder: 4 },
        { title: 'Custom', slug: 'custom', displayOrder: 5 },
      ];
      
      for (const card of reasonCards) {
        await prisma.categoryCard.create({
          data: {
            sectionId: reasonSection.id,
            title: card.title,
            slug: card.slug,
            displayOrder: card.displayOrder,
          }
        });
      }
      
      console.log("✅ Created category sections and cards");
    }

    // Test operations
    const sections = await prisma.categorySection.findMany({
      include: { cards: true }
    });
    const settings = await prisma.siteSettings.findMany();

    return NextResponse.json({
      success: true,
      message: "CMS database fixed successfully",
      data: {
        categorySections: sections.length,
        siteSettings: settings.length,
      }
    });

  } catch (error) {
    console.error("💥 CMS fix failed:", error);
    return NextResponse.json(
      { 
        error: "CMS fix failed", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
