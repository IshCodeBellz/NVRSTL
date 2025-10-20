#!/usr/bin/env tsx

/**
 * System Resource Monitor for Load Testing
 * Monitors CPU, Memory, Database connections during load tests
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

interface SystemMetrics {
  timestamp: string;
  cpu: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    activeConnections: number;
    totalConnections: number;
    queriesPerSecond: number;
  };
  responseTime: number;
  errorRate: number;
}

class SystemMonitor {
  private metrics: SystemMetrics[] = [];
  private monitoring = false;
  private interval?: NodeJS.Timeout;

  async start() {
    console.log("🔍 Starting system monitoring...");
    this.monitoring = true;

    this.interval = setInterval(async () => {
      if (!this.monitoring) return;

      try {
        const metrics = await this.collectMetrics();
        this.metrics.push(metrics);
        this.logMetrics(metrics);
      } catch (error) {
        console.error("Error collecting metrics:", error);
      }
    }, 5000); // Every 5 seconds
  }

  stop() {
    console.log("⏹️  Stopping system monitoring...");
    this.monitoring = false;
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.saveResults();
  }

  private async collectMetrics(): Promise<SystemMetrics> {
    const timestamp = new Date().toISOString();

    // CPU Usage
    const cpu = this.getCpuUsage();

    // Memory Usage
    const memory = this.getMemoryUsage();

    // Database metrics
    const database = await this.getDatabaseMetrics();

    // Response time check
    const responseTime = await this.checkResponseTime();

    return {
      timestamp,
      cpu,
      memory,
      database,
      responseTime,
      errorRate: 0, // Will be calculated from load test results
    };
  }

  private getCpuUsage(): number {
    try {
      // Get CPU usage on macOS/Linux
      const cpuInfo = execSync('top -l 1 -n 0 | grep "CPU usage"', {
        encoding: "utf8",
      });
      const match = cpuInfo.match(/(\d+\.\d+)% user/);
      return match ? parseFloat(match[1]) : 0;
    } catch (error) {
      return 0;
    }
  }

  private getMemoryUsage() {
    try {
      const memInfo = execSync("free -m 2>/dev/null || vm_stat", {
        encoding: "utf8",
      });

      if (memInfo.includes("Pages")) {
        // macOS vm_stat output
        const pageSize = 4096; // 4KB pages on macOS
        const freeMatch = memInfo.match(/Pages free:\s+(\d+)/);
        const activeMatch = memInfo.match(/Pages active:\s+(\d+)/);

        const freePages = freeMatch ? parseInt(freeMatch[1]) : 0;
        const activePages = activeMatch ? parseInt(activeMatch[1]) : 0;

        const totalMemoryGB = 16; // Assume 16GB, adjust as needed
        const totalBytes = totalMemoryGB * 1024 * 1024 * 1024;
        const usedBytes = activePages * pageSize;

        return {
          used: Math.round(usedBytes / (1024 * 1024)), // MB
          total: Math.round(totalBytes / (1024 * 1024)), // MB
          percentage: Math.round((usedBytes / totalBytes) * 100),
        };
      } else {
        // Linux free output
        const lines = memInfo.split("\n");
        const memLine = lines.find((line) => line.startsWith("Mem:"));
        if (memLine) {
          const parts = memLine.split(/\s+/);
          const total = parseInt(parts[1]);
          const used = parseInt(parts[2]);
          return {
            used,
            total,
            percentage: Math.round((used / total) * 100),
          };
        }
      }
    } catch (error) {
      console.error("Error getting memory usage:", error);
    }

    return { used: 0, total: 0, percentage: 0 };
  }

  private async getDatabaseMetrics() {
    try {
      const response = await fetch("http://localhost:3000/api/health/database");
      if (response.ok) {
        const data = await response.json();
        return {
          activeConnections: data.metrics?.activeConnections || 0,
          totalConnections: data.metrics?.totalConnections || 0,
          queriesPerSecond: data.metrics?.queriesPerSecond || 0,
        };
      }
    } catch (error) {
      console.error("Error fetching database metrics:", error);
    }

    return {
      activeConnections: 0,
      totalConnections: 0,
      queriesPerSecond: 0,
    };
  }

  private async checkResponseTime(): Promise<number> {
    try {
      const start = Date.now();
      const response = await fetch("http://localhost:3000/api/health");
      const end = Date.now();

      if (response.ok) {
        return end - start;
      }
    } catch (error) {
      console.error("Error checking response time:", error);
    }

    return 0;
  }

  private logMetrics(metrics: SystemMetrics) {
    console.log(`📊 ${metrics.timestamp}`);
    console.log(`   CPU: ${metrics.cpu.toFixed(1)}%`);
    console.log(
      `   Memory: ${metrics.memory.used}MB/${metrics.memory.total}MB (${metrics.memory.percentage}%)`
    );
    console.log(
      `   DB Connections: ${metrics.database.activeConnections}/${metrics.database.totalConnections}`
    );
    console.log(`   Response Time: ${metrics.responseTime}ms`);
    console.log("");
  }

  private saveResults() {
    const resultsDir = path.join(__dirname, "results");
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const filename = `system-metrics-${Date.now()}.json`;
    const filepath = path.join(resultsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(this.metrics, null, 2));

    console.log(`📁 System metrics saved to: ${filepath}`);

    // Generate summary
    this.generateSummary();
  }

  private generateSummary() {
    if (this.metrics.length === 0) return;

    const avgCpu =
      this.metrics.reduce((sum, m) => sum + m.cpu, 0) / this.metrics.length;
    const avgMemory =
      this.metrics.reduce((sum, m) => sum + m.memory.percentage, 0) /
      this.metrics.length;
    const avgResponseTime =
      this.metrics.reduce((sum, m) => sum + m.responseTime, 0) /
      this.metrics.length;
    const maxCpu = Math.max(...this.metrics.map((m) => m.cpu));
    const maxMemory = Math.max(...this.metrics.map((m) => m.memory.percentage));
    const maxResponseTime = Math.max(
      ...this.metrics.map((m) => m.responseTime)
    );

    console.log("📈 LOAD TEST SUMMARY");
    console.log("===================");
    console.log(
      `Duration: ${this.metrics.length * 5}s (${this.metrics.length} samples)`
    );
    console.log("");
    console.log("CPU Usage:");
    console.log(`  Average: ${avgCpu.toFixed(1)}%`);
    console.log(`  Peak: ${maxCpu.toFixed(1)}%`);
    console.log("");
    console.log("Memory Usage:");
    console.log(`  Average: ${avgMemory.toFixed(1)}%`);
    console.log(`  Peak: ${maxMemory.toFixed(1)}%`);
    console.log("");
    console.log("Response Time:");
    console.log(`  Average: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`  Peak: ${maxResponseTime.toFixed(0)}ms`);

    // Performance assessment
    console.log("");
    console.log("🎯 PERFORMANCE ASSESSMENT");
    console.log("=========================");

    if (avgResponseTime < 200) {
      console.log("✅ Response Time: EXCELLENT (< 200ms)");
    } else if (avgResponseTime < 500) {
      console.log("🟡 Response Time: GOOD (200-500ms)");
    } else {
      console.log("❌ Response Time: POOR (> 500ms)");
    }

    if (maxCpu < 70) {
      console.log("✅ CPU Usage: EXCELLENT (< 70%)");
    } else if (maxCpu < 85) {
      console.log("🟡 CPU Usage: MODERATE (70-85%)");
    } else {
      console.log("❌ CPU Usage: HIGH (> 85%)");
    }

    if (maxMemory < 80) {
      console.log("✅ Memory Usage: EXCELLENT (< 80%)");
    } else if (maxMemory < 90) {
      console.log("🟡 Memory Usage: MODERATE (80-90%)");
    } else {
      console.log("❌ Memory Usage: HIGH (> 90%)");
    }
  }
}

// CLI usage
if (require.main === module) {
  const monitor = new SystemMonitor();

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    monitor.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    monitor.stop();
    process.exit(0);
  });

  monitor.start();

  // Auto-stop after 10 minutes if not stopped manually
  setTimeout(() => {
    console.log("⏰ Auto-stopping monitor after 10 minutes");
    monitor.stop();
    process.exit(0);
  }, 10 * 60 * 1000);
}

export { SystemMonitor };
