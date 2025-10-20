#!/usr/bin/env tsx

/**
 * SSL/TLS Security Validator
 * Tests SSL certificate validation and TLS security
 */

import https from "https";
import tls from "tls";
import { URL } from "url";

interface SSLTest {
  testName: string;
  status: "PASS" | "FAIL" | "WARNING" | "INFO";
  description: string;
  details?: string;
  recommendation?: string;
}

class SSLSecurityValidator {
  private results: SSLTest[] = [];
  private domain: string;
  private port: number;

  constructor(url: string) {
    const parsed = new URL(url);
    this.domain = parsed.hostname;
    this.port = parsed.port ? parseInt(parsed.port) : 443;
  }

  async validateSSLSecurity() {
    console.log("🔒 SSL/TLS SECURITY VALIDATION");
    console.log("==============================");
    console.log(`Target: ${this.domain}:${this.port}`);
    console.log("");

    try {
      // Test 1: SSL Certificate Validity
      await this.testSSLCertificate();

      // Test 2: TLS Version Support
      await this.testTLSVersions();

      // Test 3: Cipher Suite Security
      await this.testCipherSuites();

      // Test 4: Certificate Chain Validation
      await this.testCertificateChain();

      // Test 5: HSTS Header
      await this.testHSTSHeader();

      this.generateSSLReport();
    } catch (error) {
      console.error("❌ SSL/TLS validation failed:", error);
    }
  }

  private async testSSLCertificate(): Promise<void> {
    console.log("📜 Testing SSL certificate validity...");

    return new Promise((resolve) => {
      const socket = tls.connect(
        this.port,
        this.domain,
        {
          servername: this.domain,
          rejectUnauthorized: false, // We'll check manually
        },
        () => {
          try {
            const cert = socket.getPeerCertificate();
            const authorized = socket.authorized;
            const authorizationError = socket.authorizationError;

            if (authorized) {
              this.addSSLResult({
                testName: "SSL Certificate Validity",
                status: "PASS",
                description: "SSL certificate is valid and trusted",
                details: `Subject: ${cert.subject?.CN || "Unknown"}`,
              });
            } else {
              this.addSSLResult({
                testName: "SSL Certificate Validity",
                status: "FAIL",
                description: "SSL certificate validation failed",
                details: authorizationError
                  ? authorizationError instanceof Error
                    ? authorizationError.message
                    : String(authorizationError)
                  : "Unknown error",
                recommendation:
                  "Ensure SSL certificate is valid and properly configured",
              });
            }

            // Check expiration
            if (cert.valid_to) {
              const expiryDate = new Date(cert.valid_to);
              const now = new Date();
              const daysUntilExpiry = Math.floor(
                (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );

              if (daysUntilExpiry < 0) {
                this.addSSLResult({
                  testName: "Certificate Expiration",
                  status: "FAIL",
                  description: "SSL certificate has expired",
                  details: `Expired on: ${cert.valid_to}`,
                  recommendation: "Renew SSL certificate immediately",
                });
              } else if (daysUntilExpiry < 30) {
                this.addSSLResult({
                  testName: "Certificate Expiration",
                  status: "WARNING",
                  description: "SSL certificate expires soon",
                  details: `Expires in ${daysUntilExpiry} days`,
                  recommendation: "Plan certificate renewal",
                });
              } else {
                this.addSSLResult({
                  testName: "Certificate Expiration",
                  status: "PASS",
                  description: "SSL certificate expiration is healthy",
                  details: `Expires in ${daysUntilExpiry} days`,
                });
              }
            }

            socket.end();
            resolve();
          } catch (error) {
            this.addSSLResult({
              testName: "SSL Certificate Test",
              status: "FAIL",
              description: "Failed to validate SSL certificate",
              recommendation: "Check SSL certificate configuration",
            });
            socket.end();
            resolve();
          }
        }
      );

      socket.on("error", (error) => {
        this.addSSLResult({
          testName: "SSL Connection",
          status: "FAIL",
          description: "Failed to establish SSL connection",
          details: error.message,
          recommendation: "Check SSL/TLS configuration and firewall settings",
        });
        resolve();
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        socket.end();
        this.addSSLResult({
          testName: "SSL Connection Timeout",
          status: "WARNING",
          description: "SSL connection timed out",
        });
        resolve();
      }, 10000);
    });
  }

  private async testTLSVersions(): Promise<void> {
    console.log("🔐 Testing TLS versions...");

    const tlsVersions = [
      { version: "TLSv1", secure: false },
      { version: "TLSv1.1", secure: false },
      { version: "TLSv1.2", secure: true },
      { version: "TLSv1.3", secure: true },
    ];

    const supportedVersions: string[] = [];
    const insecureVersions: string[] = [];

    for (const { version, secure } of tlsVersions) {
      const isSupported = await this.testTLSVersion(version);

      if (isSupported) {
        supportedVersions.push(version);
        if (!secure) {
          insecureVersions.push(version);
        }
      }
    }

    if (insecureVersions.length > 0) {
      this.addSSLResult({
        testName: "Insecure TLS Versions",
        status: "FAIL",
        description: "Server supports insecure TLS versions",
        details: `Insecure: ${insecureVersions.join(", ")}`,
        recommendation: "Disable TLS 1.0 and 1.1, use only TLS 1.2+",
      });
    } else if (
      supportedVersions.includes("TLSv1.2") ||
      supportedVersions.includes("TLSv1.3")
    ) {
      this.addSSLResult({
        testName: "TLS Version Security",
        status: "PASS",
        description: "Server supports secure TLS versions only",
        details: `Supported: ${supportedVersions.join(", ")}`,
      });
    } else {
      this.addSSLResult({
        testName: "TLS Version Support",
        status: "WARNING",
        description: "Unable to determine TLS version support",
      });
    }
  }

  private async testTLSVersion(version: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const socket = tls.connect(
          this.port,
          this.domain,
          {
            servername: this.domain,
            secureProtocol:
              version === "TLSv1.3"
                ? "TLSv1_3_method"
                : version === "TLSv1.2"
                ? "TLSv1_2_method"
                : version === "TLSv1.1"
                ? "TLSv1_1_method"
                : "TLSv1_method",
            rejectUnauthorized: false,
          },
          () => {
            socket.end();
            resolve(true);
          }
        );

        socket.on("error", () => {
          resolve(false);
        });

        setTimeout(() => {
          socket.destroy();
          resolve(false);
        }, 5000);
      } catch (error) {
        resolve(false);
      }
    });
  }

  private async testCipherSuites(): Promise<void> {
    console.log("🔑 Testing cipher suites...");

    return new Promise((resolve) => {
      const socket = tls.connect(
        this.port,
        this.domain,
        {
          servername: this.domain,
          rejectUnauthorized: false,
        },
        () => {
          try {
            const cipher = socket.getCipher();

            if (cipher) {
              const strongCiphers = ["ECDHE", "DHE"];
              const weakCiphers = ["RC4", "DES", "MD5"];

              const cipherName = cipher.name || "";
              const isStrong = strongCiphers.some((strong) =>
                cipherName.includes(strong)
              );
              const isWeak = weakCiphers.some((weak) =>
                cipherName.includes(weak)
              );

              if (isWeak) {
                this.addSSLResult({
                  testName: "Cipher Suite Security",
                  status: "FAIL",
                  description: "Server uses weak cipher suites",
                  details: `Current: ${cipherName}`,
                  recommendation:
                    "Configure server to use only strong cipher suites",
                });
              } else if (isStrong) {
                this.addSSLResult({
                  testName: "Cipher Suite Security",
                  status: "PASS",
                  description: "Server uses strong cipher suites",
                  details: `Current: ${cipherName}`,
                });
              } else {
                this.addSSLResult({
                  testName: "Cipher Suite Security",
                  status: "INFO",
                  description: "Cipher suite security assessment",
                  details: `Current: ${cipherName}`,
                });
              }
            }

            socket.end();
            resolve();
          } catch (error) {
            this.addSSLResult({
              testName: "Cipher Suite Test",
              status: "WARNING",
              description: "Unable to determine cipher suite",
            });
            socket.end();
            resolve();
          }
        }
      );

      socket.on("error", () => {
        this.addSSLResult({
          testName: "Cipher Suite Connection",
          status: "WARNING",
          description: "Failed to test cipher suites",
        });
        resolve();
      });

      setTimeout(() => {
        socket.end();
        resolve();
      }, 5000);
    });
  }

  private async testCertificateChain(): Promise<void> {
    console.log("🔗 Testing certificate chain...");

    return new Promise((resolve) => {
      const socket = tls.connect(
        this.port,
        this.domain,
        {
          servername: this.domain,
          rejectUnauthorized: false,
        },
        () => {
          try {
            const cert = socket.getPeerCertificate(true);

            if (cert) {
              // Count certificates in chain
              let chainLength = 0;
              let currentCert = cert;

              while (currentCert && chainLength < 10) {
                // Prevent infinite loop
                chainLength++;
                currentCert = currentCert.issuerCertificate;
                if (currentCert === cert) break; // Self-signed root
              }

              if (chainLength >= 2) {
                this.addSSLResult({
                  testName: "Certificate Chain",
                  status: "PASS",
                  description: "Complete certificate chain present",
                  details: `Chain length: ${chainLength} certificates`,
                });
              } else {
                this.addSSLResult({
                  testName: "Certificate Chain",
                  status: "WARNING",
                  description: "Incomplete certificate chain",
                  details: `Chain length: ${chainLength} certificates`,
                  recommendation:
                    "Ensure intermediate certificates are properly configured",
                });
              }
            }

            socket.end();
            resolve();
          } catch (error) {
            this.addSSLResult({
              testName: "Certificate Chain Test",
              status: "WARNING",
              description: "Unable to analyze certificate chain",
            });
            socket.end();
            resolve();
          }
        }
      );

      socket.on("error", () => {
        resolve();
      });

      setTimeout(() => {
        socket.end();
        resolve();
      }, 5000);
    });
  }

  private async testHSTSHeader(): Promise<void> {
    console.log("🛡️ Testing HSTS header...");

    try {
      const response = await fetch(`https://${this.domain}`, {
        method: "HEAD",
        // @ts-ignore - Node.js fetch options
        timeout: 10000,
      });

      const hstsHeader = response.headers.get("strict-transport-security");

      if (hstsHeader) {
        const maxAge = hstsHeader.match(/max-age=(\d+)/);
        const includesSubdomains = hstsHeader.includes("includeSubDomains");
        const preload = hstsHeader.includes("preload");

        const maxAgeValue = maxAge ? parseInt(maxAge[1]) : 0;
        const oneYear = 365 * 24 * 60 * 60; // seconds in a year

        if (maxAgeValue >= oneYear && includesSubdomains) {
          this.addSSLResult({
            testName: "HSTS Security",
            status: "PASS",
            description: "Strong HSTS policy configured",
            details: `max-age=${maxAgeValue}, includeSubDomains=${includesSubdomains}, preload=${preload}`,
          });
        } else if (maxAgeValue > 0) {
          this.addSSLResult({
            testName: "HSTS Security",
            status: "WARNING",
            description: "HSTS policy could be strengthened",
            details: `max-age=${maxAgeValue}, includeSubDomains=${includesSubdomains}`,
            recommendation:
              "Set max-age to at least 1 year and include subdomains",
          });
        } else {
          this.addSSLResult({
            testName: "HSTS Security",
            status: "FAIL",
            description: "Invalid HSTS policy",
            details: hstsHeader,
            recommendation: "Configure proper HSTS max-age value",
          });
        }
      } else {
        this.addSSLResult({
          testName: "HSTS Header",
          status: "FAIL",
          description: "HSTS header not found",
          recommendation: "Implement HTTP Strict Transport Security (HSTS)",
        });
      }
    } catch (error) {
      this.addSSLResult({
        testName: "HSTS Test",
        status: "WARNING",
        description: "Unable to test HSTS header",
      });
    }
  }

  private addSSLResult(result: SSLTest) {
    this.results.push(result);

    const statusIcon = {
      PASS: "✅",
      FAIL: "❌",
      WARNING: "⚠️",
      INFO: "ℹ️",
    }[result.status];

    console.log(`  ${statusIcon} ${result.testName}: ${result.description}`);
    if (result.details) {
      console.log(`     📋 ${result.details}`);
    }
    if (result.recommendation) {
      console.log(`     💡 ${result.recommendation}`);
    }
  }

  private generateSSLReport() {
    console.log("\n🔒 SSL/TLS SECURITY REPORT");
    console.log("==========================");

    const summary = {
      total: this.results.length,
      pass: this.results.filter((r) => r.status === "PASS").length,
      fail: this.results.filter((r) => r.status === "FAIL").length,
      warning: this.results.filter((r) => r.status === "WARNING").length,
      info: this.results.filter((r) => r.status === "INFO").length,
    };

    console.log(`Total Tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.pass}`);
    console.log(`❌ Failed: ${summary.fail}`);
    console.log(`⚠️  Warnings: ${summary.warning}`);
    console.log(`ℹ️  Info: ${summary.info}`);

    // Calculate SSL score
    const score = Math.round(
      (summary.pass / (summary.total - summary.info)) * 100
    );
    console.log(`\n📊 SSL Security Score: ${score}%`);

    const criticalIssues = this.results.filter((r) => r.status === "FAIL");
    if (criticalIssues.length > 0) {
      console.log("\n❌ CRITICAL SSL/TLS ISSUES");
      console.log("===========================");
      criticalIssues.forEach((test) => {
        console.log(`• ${test.testName}: ${test.description}`);
        if (test.recommendation) {
          console.log(`  💡 ${test.recommendation}`);
        }
      });
    }

    // Overall assessment
    if (score >= 80 && criticalIssues.length === 0) {
      console.log("\n✅ SSL/TLS security is EXCELLENT");
    } else if (score >= 60) {
      console.log("\n⚠️  SSL/TLS security is ACCEPTABLE but could be improved");
    } else {
      console.log("\n❌ SSL/TLS security needs URGENT attention");
    }
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  let url = "https://localhost:3000";

  if (args.includes("--help")) {
    console.log("Usage: npx tsx ssl-security.ts [--url <https://example.com>]");
    return;
  }

  for (let i = 0; i < args.length; i += 2) {
    if (args[i] === "--url") {
      url = args[i + 1] || url;
    }
  }

  try {
    const validator = new SSLSecurityValidator(url);
    await validator.validateSSLSecurity();
  } catch (error) {
    console.error("Failed to validate SSL security:", error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { SSLSecurityValidator };
