import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedTeams() {
  try {
    console.log("🌱 Seeding teams...");

    // First, create Football category if it doesn't exist
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

    console.log("\n🎉 Team seeding complete!");
    console.log(
      "You can now visit /admin/product-teams to link products to teams."
    );
  } catch (error) {
    console.error("❌ Error seeding teams:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTeams();
