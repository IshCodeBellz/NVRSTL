#!/usr/bin/env tsx

/**
 * Comprehensive Security Audit Runner
 * Orchestrates all security tests for production readiness
 */

import { SecurityAuditor } from "./security-audit";
import { WebhookSecurityValidator } from "./webhook-security";
import { SSLSecurityValidator } from "./ssl-security";

interface SecurityReport {
  timestamp: string;
  environment: string;
  overallScore: number;
  testSuites: {
    name: string;
    score: number;
    status: "PASS" | "FAIL" | "WARNING";
    critical: number;
    high: number;
    medium: number;
    low: number;
  }[];
  recommendations: string[];
  criticalIssues: string[];
}

class ComprehensiveSecurityAudit {
  private baseUrl: string;
  private environment: string;
  private report: SecurityReport;

  constructor(baseUrl = "http://localhost:3000", environment = "development") {
    this.baseUrl = baseUrl;
    this.environment = environment;
    this.report = {
      timestamp: new Date().toISOString(),
      environment,
      overallScore: 0,
      testSuites: [],
      recommendations: [],
      criticalIssues: [],
    };
  }

  async runCompleteSecurityAudit() {
    console.log("🛡️  COMPREHENSIVE SECURITY AUDIT");
    console.log("==================================");
    console.log(`Environment: ${this.environment}`);
    console.log(`Target: ${this.baseUrl}`);
    console.log(`Timestamp: ${this.report.timestamp}`);
    console.log("");

    try {
      // Run all security test suites
      await this.runApplicationSecurityTests();
      await this.runWebhookSecurityTests();

      // Only run SSL tests for HTTPS URLs
      if (this.baseUrl.startsWith("https://")) {
        await this.runSSLSecurityTests();
      }

      // Generate comprehensive report
      this.generateComprehensiveReport();
      this.saveSecurityReport();
    } catch (error) {
      console.error("❌ Security audit failed:", error);
    }
  }

  private async runApplicationSecurityTests() {
    console.log("🔐 Running Application Security Tests...");
    console.log("========================================");

    const auditor = new SecurityAuditor(this.baseUrl);

    // Capture console output to extract results
    const originalLog = console.log;
    let capturedOutput = "";
    console.log = (...args) => {
      capturedOutput += args.join(" ") + "\n";
      originalLog(...args);
    };

    try {
      await auditor.runFullSecurityAudit();

      // Parse results from captured output
      const score = this.extractScoreFromOutput(
        capturedOutput,
        "Security Score:"
      );
      const issues = this.extractIssuesFromOutput(capturedOutput);

      this.report.testSuites.push({
        name: "Application Security",
        score: score || 0,
        status: score >= 80 ? "PASS" : score >= 60 ? "WARNING" : "FAIL",
        critical: issues.critical,
        high: issues.high,
        medium: issues.medium,
        low: issues.low,
      });
    } finally {
      console.log = originalLog;
    }

    console.log("");
  }

  private async runWebhookSecurityTests() {
    console.log("🔗 Running Webhook Security Tests...");
    console.log("====================================");

    const validator = new WebhookSecurityValidator(this.baseUrl);

    const originalLog = console.log;
    let capturedOutput = "";
    console.log = (...args) => {
      capturedOutput += args.join(" ") + "\n";
      originalLog(...args);
    };

    try {
      await validator.validateWebhookSecurity();

      const passCount = (capturedOutput.match(/✅/g) || []).length;
      const failCount = (capturedOutput.match(/❌/g) || []).length;
      const totalCount =
        passCount + failCount + (capturedOutput.match(/⚠️/g) || []).length;
      const score =
        totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0;

      this.report.testSuites.push({
        name: "Webhook Security",
        score,
        status: failCount === 0 ? "PASS" : "FAIL",
        critical: failCount,
        high: 0,
        medium: (capturedOutput.match(/⚠️/g) || []).length,
        low: 0,
      });
    } finally {
      console.log = originalLog;
    }

    console.log("");
  }

  private async runSSLSecurityTests() {
    console.log("🔒 Running SSL/TLS Security Tests...");
    console.log("====================================");

    try {
      const sslUrl = this.baseUrl.replace("http://", "https://");
      const validator = new SSLSecurityValidator(sslUrl);

      const originalLog = console.log;
      let capturedOutput = "";
      console.log = (...args) => {
        capturedOutput += args.join(" ") + "\n";
        originalLog(...args);
      };

      try {
        await validator.validateSSLSecurity();

        const score = this.extractScoreFromOutput(
          capturedOutput,
          "SSL Security Score:"
        );
        const passCount = (capturedOutput.match(/✅/g) || []).length;
        const failCount = (capturedOutput.match(/❌/g) || []).length;
        const warningCount = (capturedOutput.match(/⚠️/g) || []).length;

        this.report.testSuites.push({
          name: "SSL/TLS Security",
          score: score || 0,
          status: failCount === 0 ? "PASS" : "FAIL",
          critical: failCount,
          high: 0,
          medium: warningCount,
          low: 0,
        });
      } finally {
        console.log = originalLog;
      }
    } catch (error) {
      console.log("⚠️  SSL/TLS tests skipped (HTTPS not available)");
    }

    console.log("");
  }

  private extractScoreFromOutput(output: string, scorePattern: string): number {
    const scoreMatch = output.match(new RegExp(scorePattern + "\\s*(\\d+)%"));
    return scoreMatch ? parseInt(scoreMatch[1]) : 0;
  }

  private extractIssuesFromOutput(output: string) {
    return {
      critical: (output.match(/CRITICAL/g) || []).length,
      high: (output.match(/HIGH/g) || []).length,
      medium: (output.match(/MEDIUM/g) || []).length,
      low: (output.match(/LOW/g) || []).length,
    };
  }

  private generateComprehensiveReport() {
    console.log("📊 COMPREHENSIVE SECURITY REPORT");
    console.log("=================================");

    // Calculate overall score
    const totalScore = this.report.testSuites.reduce(
      (sum, suite) => sum + suite.score,
      0
    );
    this.report.overallScore =
      this.report.testSuites.length > 0
        ? Math.round(totalScore / this.report.testSuites.length)
        : 0;

    console.log(`Environment: ${this.environment}`);
    console.log(`Overall Security Score: ${this.report.overallScore}%`);
    console.log("");

    // Test suite summary
    console.log("📋 Test Suite Results:");
    console.log("=====================");
    this.report.testSuites.forEach((suite) => {
      const statusIcon =
        suite.status === "PASS"
          ? "✅"
          : suite.status === "WARNING"
          ? "⚠️"
          : "❌";
      console.log(
        `${statusIcon} ${suite.name}: ${suite.score}% (${suite.status})`
      );

      if (suite.critical > 0 || suite.high > 0) {
        console.log(`   🚨 Critical: ${suite.critical}, High: ${suite.high}`);
      }
      if (suite.medium > 0 || suite.low > 0) {
        console.log(`   📝 Medium: ${suite.medium}, Low: ${suite.low}`);
      }
    });

    console.log("");

    // Security recommendations
    this.generateSecurityRecommendations();

    // Overall assessment
    this.generateOverallAssessment();
  }

  private generateSecurityRecommendations() {
    console.log("💡 Security Recommendations:");
    console.log("============================");

    const recommendations = [];

    // Check for critical issues
    const hasCriticalIssues = this.report.testSuites.some(
      (suite) => suite.critical > 0
    );
    if (hasCriticalIssues) {
      recommendations.push(
        "🚨 URGENT: Address all critical security vulnerabilities immediately"
      );
    }

    // Score-based recommendations
    if (this.report.overallScore < 60) {
      recommendations.push("❌ Security posture requires immediate attention");
      recommendations.push(
        "🔒 Implement basic security controls (authentication, input validation, HTTPS)"
      );
    } else if (this.report.overallScore < 80) {
      recommendations.push("⚠️  Security is acceptable but needs improvement");
      recommendations.push("🛡️  Strengthen security headers and validation");
    } else {
      recommendations.push("✅ Security posture is strong");
      recommendations.push(
        "🔍 Continue regular security monitoring and updates"
      );
    }

    // Environment-specific recommendations
    if (this.environment === "production") {
      recommendations.push(
        "🏭 Production: Ensure all security measures are active"
      );
      recommendations.push("📊 Set up continuous security monitoring");
      recommendations.push("🔄 Schedule regular security audits");
    } else {
      recommendations.push(
        "🧪 Development: Prepare security measures for production deployment"
      );
    }

    // SSL/TLS recommendations
    const sslSuite = this.report.testSuites.find(
      (suite) => suite.name === "SSL/TLS Security"
    );
    if (!sslSuite && this.environment === "production") {
      recommendations.push("🔒 CRITICAL: Implement HTTPS/SSL for production");
    }

    this.report.recommendations = recommendations;
    recommendations.forEach((rec) => console.log(`   ${rec}`));
    console.log("");
  }

  private generateOverallAssessment() {
    console.log("🎯 Overall Security Assessment:");
    console.log("==============================");

    const score = this.report.overallScore;
    const hasCritical = this.report.testSuites.some(
      (suite) => suite.critical > 0
    );

    if (hasCritical) {
      console.log("🚨 CRITICAL SECURITY ISSUES DETECTED");
      console.log("   → DO NOT DEPLOY TO PRODUCTION");
      console.log("   → Address all critical vulnerabilities first");
    } else if (score >= 90) {
      console.log("🏆 EXCELLENT SECURITY POSTURE");
      console.log("   → Ready for production deployment");
      console.log("   → Maintain current security practices");
    } else if (score >= 80) {
      console.log("✅ GOOD SECURITY POSTURE");
      console.log("   → Acceptable for production with monitoring");
      console.log("   → Consider implementing additional hardening");
    } else if (score >= 60) {
      console.log("⚠️  MARGINAL SECURITY POSTURE");
      console.log("   → Requires improvement before production");
      console.log("   → Address medium and high priority issues");
    } else {
      console.log("❌ INADEQUATE SECURITY POSTURE");
      console.log("   → NOT ready for production deployment");
      console.log("   → Significant security improvements required");
    }

    console.log("");
    console.log("📅 Next Steps:");
    console.log("==============");

    if (hasCritical || score < 60) {
      console.log("1. 🚨 Address critical and high severity issues");
      console.log("2. 🔄 Re-run security audit");
      console.log("3. 📋 Review and implement recommendations");
      console.log("4. 🏭 Only deploy after achieving acceptable score");
    } else {
      console.log("1. 📊 Set up continuous monitoring");
      console.log("2. 🔄 Schedule regular security audits");
      console.log("3. 📚 Keep security measures updated");
      console.log("4. ✅ Proceed with deployment confidence");
    }
  }

  private saveSecurityReport() {
    const fs = require("fs");
    const path = require("path");

    try {
      const reportDir = path.join(process.cwd(), "security-audit", "reports");
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }

      const filename = `security-report-${this.environment}-${
        new Date().toISOString().split("T")[0]
      }.json`;
      const filepath = path.join(reportDir, filename);

      fs.writeFileSync(filepath, JSON.stringify(this.report, null, 2));
      console.log(`\n💾 Security report saved: ${filename}`);
    } catch (error) {
      console.error("⚠️  Failed to save security report:", error);
    }
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  let baseUrl = "http://localhost:3000";
  let environment = "development";

  if (args.includes("--help")) {
    console.log("Usage: npx tsx run-security-audit.ts [options]");
    console.log("Options:");
    console.log(
      "  --url <url>          Target URL (default: http://localhost:3000)"
    );
    console.log("  --env <environment>  Environment (default: development)");
    console.log("  --production         Shortcut for production environment");
    return;
  }

  for (let i = 0; i < args.length; i += 2) {
    if (args[i] === "--url") {
      baseUrl = args[i + 1] || baseUrl;
    } else if (args[i] === "--env") {
      environment = args[i + 1] || environment;
    }
  }

  if (args.includes("--production")) {
    environment = "production";
  }

  console.log("🚀 Starting Comprehensive Security Audit...\n");

  const audit = new ComprehensiveSecurityAudit(baseUrl, environment);
  await audit.runCompleteSecurityAudit();

  console.log("\n🏁 Security audit completed!");
}

if (require.main === module) {
  main().catch(console.error);
}

export { ComprehensiveSecurityAudit };
