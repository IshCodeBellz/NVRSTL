#!/usr/bin/env tsx

/**
 * Database Load Testing
 * Tests database performance under concurrent load
 */

import { PrismaClient } from "@prisma/client";
import { performance } from "perf_hooks";

interface DatabaseTestResult {
  testName: string;
  duration: number;
  queriesPerSecond: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  errorCount: number;
  totalQueries: number;
}

class DatabaseLoadTester {
  private prisma: PrismaClient;
  private results: DatabaseTestResult[] = [];

  constructor() {
    this.prisma = new PrismaClient();
  }

  async runAllTests() {
    console.log("🗄️  Starting Database Load Testing...");
    console.log("====================================");

    try {
      // Test 1: Product search queries
      await this.testProductSearchLoad();

      // Test 2: User authentication load
      await this.testUserAuthenticationLoad();

      // Test 3: Order creation load
      await this.testOrderCreationLoad();

      // Test 4: Concurrent read/write operations
      await this.testConcurrentOperations();

      // Test 5: Connection pool stress test
      await this.testConnectionPoolStress();

      this.generateReport();
    } finally {
      await this.prisma.$disconnect();
    }
  }

  private async testProductSearchLoad() {
    console.log("🔍 Testing product search queries...");

    const testDuration = 30000; // 30 seconds
    const concurrentUsers = 50;
    const startTime = performance.now();
    let queryCount = 0;
    let errorCount = 0;
    const responseTimes: number[] = [];

    const promises = Array.from({ length: concurrentUsers }, async () => {
      while (performance.now() - startTime < testDuration) {
        try {
          const queryStart = performance.now();

          // Simulate different search patterns
          const searchTerms = ["shirt", "jeans", "dress", "shoes", "jacket"];
          const term =
            searchTerms[Math.floor(Math.random() * searchTerms.length)];

          await this.prisma.product.findMany({
            where: {
              OR: [
                { name: { contains: term, mode: "insensitive" } },
                { description: { contains: term, mode: "insensitive" } },
              ],
            },
            include: {
              brand: true,
              category: true,
              images: true,
            },
            take: 20,
          });

          const queryEnd = performance.now();
          responseTimes.push(queryEnd - queryStart);
          queryCount++;

          // Small delay to simulate realistic usage
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 100)
          );
        } catch (error) {
          errorCount++;
        }
      }
    });

    await Promise.all(promises);

    const totalDuration = performance.now() - startTime;

    this.results.push({
      testName: "Product Search Load",
      duration: totalDuration,
      queriesPerSecond: (queryCount / totalDuration) * 1000,
      averageResponseTime:
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      errorCount,
      totalQueries: queryCount,
    });

    console.log(
      `   Completed ${queryCount} queries in ${(totalDuration / 1000).toFixed(
        1
      )}s`
    );
    console.log(`   QPS: ${((queryCount / totalDuration) * 1000).toFixed(1)}`);
    console.log(`   Errors: ${errorCount}`);
  }

  private async testUserAuthenticationLoad() {
    console.log("👤 Testing user authentication queries...");

    const testDuration = 20000; // 20 seconds
    const concurrentUsers = 30;
    const startTime = performance.now();
    let queryCount = 0;
    let errorCount = 0;
    const responseTimes: number[] = [];

    // Get some test user emails
    const users = await this.prisma.user.findMany({
      select: { email: true },
      take: 10,
    });

    if (users.length === 0) {
      console.log("   ⚠️  No users found for authentication testing");
      return;
    }

    const promises = Array.from({ length: concurrentUsers }, async () => {
      while (performance.now() - startTime < testDuration) {
        try {
          const queryStart = performance.now();

          const randomUser = users[Math.floor(Math.random() * users.length)];

          await this.prisma.user.findUnique({
            where: { email: randomUser.email },
            include: {
              orders: {
                take: 5,
                orderBy: { createdAt: "desc" },
              },
            },
          });

          const queryEnd = performance.now();
          responseTimes.push(queryEnd - queryStart);
          queryCount++;

          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 50)
          );
        } catch (error) {
          errorCount++;
        }
      }
    });

    await Promise.all(promises);

    const totalDuration = performance.now() - startTime;

    this.results.push({
      testName: "User Authentication Load",
      duration: totalDuration,
      queriesPerSecond: (queryCount / totalDuration) * 1000,
      averageResponseTime:
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      errorCount,
      totalQueries: queryCount,
    });

    console.log(
      `   Completed ${queryCount} queries in ${(totalDuration / 1000).toFixed(
        1
      )}s`
    );
    console.log(`   QPS: ${((queryCount / totalDuration) * 1000).toFixed(1)}`);
  }

  private async testOrderCreationLoad() {
    console.log("🛒 Testing order creation load...");

    const concurrentUsers = 10; // Lower for write operations
    const ordersPerUser = 5;
    const startTime = performance.now();
    let queryCount = 0;
    let errorCount = 0;
    const responseTimes: number[] = [];

    // Get test data
    const users = await this.prisma.user.findMany({ take: 10 });
    const products = await this.prisma.product.findMany({ take: 20 });

    if (users.length === 0 || products.length === 0) {
      console.log("   ⚠️  Insufficient test data for order creation");
      return;
    }

    const promises = Array.from({ length: concurrentUsers }, async () => {
      for (let i = 0; i < ordersPerUser; i++) {
        try {
          const queryStart = performance.now();

          const randomUser = users[Math.floor(Math.random() * users.length)];
          const randomProduct =
            products[Math.floor(Math.random() * products.length)];

          await this.prisma.order.create({
            data: {
              userId: randomUser.id,
              status: "PENDING",
              email: randomUser.email,
              subtotalCents: Math.floor(Math.random() * 10000) + 1000,
              shippingCents: 500,
              taxCents: 0,
              discountCents: 0,
              totalCents: Math.floor(Math.random() * 10000) + 1500,
              items: {
                create: {
                  productId: randomProduct.id,
                  sku: randomProduct.sku,
                  nameSnapshot: randomProduct.name,
                  qty: Math.floor(Math.random() * 3) + 1,
                  unitPriceCents: randomProduct.priceCents,
                  priceCentsSnapshot: randomProduct.priceCents,
                  lineTotalCents:
                    randomProduct.priceCents * Math.floor(Math.random() * 3) +
                    1,
                  size: "M",
                },
              },
            },
          });

          const queryEnd = performance.now();
          responseTimes.push(queryEnd - queryStart);
          queryCount++;
        } catch (error) {
          errorCount++;
        }
      }
    });

    await Promise.all(promises);

    const totalDuration = performance.now() - startTime;

    this.results.push({
      testName: "Order Creation Load",
      duration: totalDuration,
      queriesPerSecond: (queryCount / totalDuration) * 1000,
      averageResponseTime:
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      errorCount,
      totalQueries: queryCount,
    });

    console.log(
      `   Created ${queryCount} orders in ${(totalDuration / 1000).toFixed(1)}s`
    );
    console.log(
      `   Orders/sec: ${((queryCount / totalDuration) * 1000).toFixed(1)}`
    );
  }

  private async testConcurrentOperations() {
    console.log("⚡ Testing concurrent read/write operations...");

    const duration = 15000; // 15 seconds
    const startTime = performance.now();
    let readCount = 0;
    let writeCount = 0;
    let errorCount = 0;

    // Concurrent readers (high load)
    const readers = Array.from({ length: 30 }, async () => {
      while (performance.now() - startTime < duration) {
        try {
          await this.prisma.product.count();
          readCount++;
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 10)
          );
        } catch (error) {
          errorCount++;
        }
      }
    });

    // Concurrent writers (lower load)
    const writers = Array.from({ length: 5 }, async () => {
      while (performance.now() - startTime < duration) {
        try {
          const randomMetrics = {
            views: Math.floor(Math.random() * 100),
            addToCart: Math.floor(Math.random() * 10),
            purchases: Math.floor(Math.random() * 5),
          };

          await this.prisma.productMetrics.updateMany({
            where: {},
            data: randomMetrics,
          });

          writeCount++;
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 100)
          );
        } catch (error) {
          errorCount++;
        }
      }
    });

    await Promise.all([...readers, ...writers]);

    const totalDuration = performance.now() - startTime;
    const totalOperations = readCount + writeCount;

    this.results.push({
      testName: "Concurrent Read/Write Operations",
      duration: totalDuration,
      queriesPerSecond: (totalOperations / totalDuration) * 1000,
      averageResponseTime: 0, // Not measured for this test
      maxResponseTime: 0,
      minResponseTime: 0,
      errorCount,
      totalQueries: totalOperations,
    });

    console.log(`   Read operations: ${readCount}`);
    console.log(`   Write operations: ${writeCount}`);
    console.log(
      `   Total ops/sec: ${((totalOperations / totalDuration) * 1000).toFixed(
        1
      )}`
    );
  }

  private async testConnectionPoolStress() {
    console.log("🔗 Testing connection pool stress...");

    const concurrentConnections = 100;
    const startTime = performance.now();
    let successCount = 0;
    let errorCount = 0;

    const promises = Array.from(
      { length: concurrentConnections },
      async (_, index) => {
        try {
          // Simulate different query patterns
          await this.prisma.product.findFirst();
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 1000)
          );
          await this.prisma.user.count();
          successCount++;
        } catch (error) {
          errorCount++;
          console.log(
            `   Connection ${index} failed:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    );

    await Promise.all(promises);

    const totalDuration = performance.now() - startTime;

    console.log(
      `   Successful connections: ${successCount}/${concurrentConnections}`
    );
    console.log(`   Connection errors: ${errorCount}`);
    console.log(`   Test duration: ${(totalDuration / 1000).toFixed(1)}s`);

    if (errorCount === 0) {
      console.log("   ✅ Connection pool handled all concurrent connections");
    } else {
      console.log(
        "   ⚠️  Some connections failed - consider tuning connection pool"
      );
    }
  }

  private generateReport() {
    console.log("\n📊 DATABASE LOAD TEST REPORT");
    console.log("============================");

    this.results.forEach((result) => {
      console.log(`\n${result.testName}:`);
      console.log(`  Duration: ${(result.duration / 1000).toFixed(1)}s`);
      console.log(`  Total Queries: ${result.totalQueries}`);
      console.log(`  Queries/Second: ${result.queriesPerSecond.toFixed(1)}`);
      if (result.averageResponseTime > 0) {
        console.log(
          `  Avg Response Time: ${result.averageResponseTime.toFixed(1)}ms`
        );
        console.log(
          `  Max Response Time: ${result.maxResponseTime.toFixed(1)}ms`
        );
      }
      console.log(`  Errors: ${result.errorCount}`);

      // Performance assessment
      if (result.queriesPerSecond > 100) {
        console.log("  Status: ✅ EXCELLENT performance");
      } else if (result.queriesPerSecond > 50) {
        console.log("  Status: 🟡 GOOD performance");
      } else {
        console.log("  Status: ❌ POOR performance - needs optimization");
      }
    });

    // Overall assessment
    const avgQPS =
      this.results.reduce((sum, r) => sum + r.queriesPerSecond, 0) /
      this.results.length;
    const totalErrors = this.results.reduce((sum, r) => sum + r.errorCount, 0);

    console.log("\n🎯 OVERALL DATABASE PERFORMANCE");
    console.log("===============================");
    console.log(`Average QPS: ${avgQPS.toFixed(1)}`);
    console.log(`Total Errors: ${totalErrors}`);

    if (avgQPS > 80 && totalErrors === 0) {
      console.log("✅ Database is READY for production load");
    } else if (avgQPS > 50 && totalErrors < 5) {
      console.log("🟡 Database performance is ACCEPTABLE");
    } else {
      console.log("❌ Database needs OPTIMIZATION before production");
    }
  }
}

// CLI usage
if (require.main === module) {
  const tester = new DatabaseLoadTester();
  tester.runAllTests().catch(console.error);
}

export { DatabaseLoadTester };
