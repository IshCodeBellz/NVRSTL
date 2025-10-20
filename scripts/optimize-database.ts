#!/usr/bin/env npx tsx

/**
 * Database Optimization Script
 *
 * This script analyzes the database and applies recommended optimizations
 * including indexes, query optimization, and maintenance tasks.
 */

import { DatabaseOptimizer } from "../lib/server/performance/DatabaseOptimizer";
import { prisma } from "../lib/server/prisma";

async function main() {
  console.log("🔍 Starting database optimization analysis...\n");

  const optimizer = DatabaseOptimizer.getInstance();

  try {
    // Step 1: Analyze current performance
    console.log("📊 Gathering performance metrics...");
    const [slowQueries, missingIndexes, tableBloat, metrics] =
      await Promise.all([
        optimizer.getSlowQueries(10),
        optimizer.getMissingIndexes(),
        optimizer.getTableBloat(),
        optimizer.getDatabaseMetrics(),
      ]);

    console.log("\n📈 Performance Analysis Results:");
    console.log(`├─ Slow queries detected: ${slowQueries.length}`);
    console.log(`├─ Missing indexes: ${missingIndexes.length}`);
    console.log(
      `├─ Tables with bloat: ${
        tableBloat.filter((t) => t.bloatPercent > 10).length
      }`
    );
    console.log(
      `└─ Cache hit ratio: ${metrics.queryPerformance.cacheHitRatio.toFixed(
        1
      )}%\n`
    );

    // Step 2: Apply high-priority index recommendations
    console.log("🚀 Applying high-priority optimizations...");
    const highPriorityIndexes = missingIndexes.filter(
      (idx) => idx.priority === "high"
    );

    for (const index of highPriorityIndexes.slice(0, 5)) {
      // Limit to 5 indexes per run
      console.log(
        `Creating index on ${index.table} (${index.columns.join(", ")})...`
      );

      try {
        const success = await optimizer.applyIndexRecommendation(index);
        if (success) {
          console.log(`✅ Index created successfully`);
        } else {
          console.log(`❌ Failed to create index`);
        }
      } catch (error) {
        console.log(
          `❌ Error creating index: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    // Step 3: Optimize tables with significant bloat
    console.log("\n🧹 Optimizing tables with bloat...");
    const bloatedTables = tableBloat.filter((table) => table.bloatPercent > 20);

    for (const table of bloatedTables.slice(0, 3)) {
      // Limit to 3 tables per run
      console.log(
        `Optimizing table ${table.table} (${table.bloatPercent.toFixed(
          1
        )}% bloat)...`
      );

      try {
        await optimizer.optimizeTable(table.table);
        console.log(`✅ Table ${table.table} optimized successfully`);
      } catch (error) {
        console.log(
          `❌ Error optimizing table: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    // Step 4: Apply essential indexes for existing tables
    console.log("\n📦 Ensuring system indexes for available tables...");

    // Get available tables first
    const availableTables = await optimizer.getAvailableTables();
    console.log(
      `Found ${availableTables.length} tables: ${availableTables.join(", ")}`
    );

    const potentialIndexes = [
      {
        table: "Shipment",
        columns: ["status", "createdAt"],
        type: "btree" as const,
        reason: "Shipment status monitoring queries",
        estimatedImprovement: 40,
        priority: "high" as const,
      },
      {
        table: "Shipment",
        columns: ["carrier", "status"],
        type: "btree" as const,
        reason: "Carrier performance analysis",
        estimatedImprovement: 35,
        priority: "high" as const,
      },
      {
        table: "Order",
        columns: ["status", "createdAt"],
        type: "btree" as const,
        reason: "Order processing queries",
        estimatedImprovement: 30,
        priority: "high" as const,
      },
      {
        table: "Product",
        columns: ["isActive", "isFeatured"],
        type: "btree" as const,
        reason: "Product listing queries",
        estimatedImprovement: 25,
        priority: "medium" as const,
      },
    ];

    // Filter indexes for tables that actually exist
    const shippingIndexes = potentialIndexes.filter((index) =>
      availableTables.includes(index.table)
    );

    for (const index of shippingIndexes) {
      const exists = await checkIndexExists(index.table, index.columns);
      if (!exists) {
        console.log(
          `Creating ${index.table} index (${index.columns.join(", ")})...`
        );
        try {
          const success = await optimizer.applyIndexRecommendation(index);
          if (success) {
            console.log(`✅ Index created successfully`);
          } else {
            console.log(`❌ Failed to create index`);
          }
        } catch (error) {
          console.log(
            `❌ Error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      } else {
        console.log(
          `✅ Index already exists for ${index.table} (${index.columns.join(
            ", "
          )})`
        );
      }
    }

    // Step 5: Update database statistics
    console.log("\n📊 Updating database statistics...");
    try {
      await prisma.$executeRaw`ANALYZE`;
      console.log("✅ Database statistics updated");
    } catch (error) {
      console.log(
        `❌ Error updating statistics: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Step 6: Final performance check
    console.log("\n🎯 Final performance check...");
    const finalMetrics = await optimizer.getDatabaseMetrics();

    console.log("┌─────────────────────────────────────┐");
    console.log("│           OPTIMIZATION SUMMARY      │");
    console.log("├─────────────────────────────────────┤");
    console.log(
      `│ Cache Hit Ratio: ${finalMetrics.queryPerformance.cacheHitRatio
        .toFixed(1)
        .padStart(13)}% │`
    );
    console.log(
      `│ Active Connections: ${finalMetrics.connectionPool.active
        .toString()
        .padStart(10)} │`
    );
    console.log(
      `│ Total Connections: ${finalMetrics.connectionPool.total
        .toString()
        .padStart(11)} │`
    );
    console.log("└─────────────────────────────────────┘");

    console.log("\n✨ Database optimization completed successfully!");
    console.log("\n📋 Recommendations:");
    console.log("├─ Monitor performance regularly using the admin dashboard");
    console.log("├─ Run this script weekly for ongoing optimization");
    console.log(
      "├─ Consider implementing Redis caching for better performance"
    );
    console.log("└─ Set up query monitoring for production workloads");
  } catch (error) {
    console.error("❌ Optimization failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function checkIndexExists(
  tableName: string,
  columns: string[]
): Promise<boolean> {
  try {
    // First check if table exists (try both cases)
    const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND (table_name = ${tableName} OR table_name = ${tableName.toLowerCase()})
      ) as exists
    `;

    if (!tableExists[0]?.exists) {
      console.log(`Table ${tableName} does not exist`);
      return false;
    }

    // Then check for indexes (try both cases)
    const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS(
        SELECT 1 FROM pg_indexes 
        WHERE (tablename = ${tableName} OR tablename = ${tableName.toLowerCase()})
        AND indexdef LIKE ${`%${columns.join("%")}%`}
      ) as exists
    `;
    return result[0]?.exists || false;
  } catch (error) {
    console.log(
      `Error checking index for ${tableName}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return false;
  }
}

// Handle script execution
if (require.main === module) {
  main().catch((error) => {
    console.error("Script execution failed:", error);
    process.exit(1);
  });
}
