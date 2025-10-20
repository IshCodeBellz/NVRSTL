import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkTables() {
  try {
    console.log("🔍 Checking available tables...");

    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    console.log("📋 Available tables:");
    tables.forEach((table) => {
      console.log(`  - ${table.tablename}`);
    });

    console.log("\n🔍 Checking for specific tables:");
    const specificTables = [
      "Product",
      "Order",
      "User",
      "Shipment",
      "Brand",
      "Category",
    ];

    for (const table of specificTables) {
      try {
        const result = await prisma.$queryRaw`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          )
        `;
        console.log(`  - ${table}: EXISTS`);
      } catch (error) {
        console.log(`  - ${table}: NOT FOUND`);
      }
    }

    // Also check lowercase versions
    console.log("\n🔍 Checking lowercase table names:");
    for (const table of specificTables) {
      const lowerTable = table.toLowerCase();
      try {
        const result = await prisma.$queryRaw`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${lowerTable}
          )
        `;
        console.log(`  - ${lowerTable}: EXISTS`);
      } catch (error) {
        console.log(`  - ${lowerTable}: NOT FOUND`);
      }
    }
  } catch (error) {
    console.error("❌ Error checking tables:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
