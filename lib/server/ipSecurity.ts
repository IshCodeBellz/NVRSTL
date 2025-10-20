import { NextRequest } from "next/server";

export interface IPInfo {
  ip: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isVPN?: boolean;
  isProxy?: boolean;
  isTor?: boolean;
  riskScore: number; // 0-100
}

export interface GeoLocation {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface IPSecurityOptions {
  blockHighRisk?: boolean;
  blockVPN?: boolean;
  blockTor?: boolean;
  blockCountries?: string[]; // ISO country codes, e.g. ["KP", "SY"]
  riskThreshold?: number; // default 80
}

export interface IPSecurityDecision {
  blocked: boolean;
  reason?: string;
  error?: string;
  ipInfo: IPInfo;
}

export class IPSecurityService {
  private static readonly HIGH_RISK_COUNTRIES = [
    "CN",
    "RU",
    "KP",
    "IR",
    "SY",
    "IQ",
    "AF",
    "MM",
    "BY",
  ];

  // Known VPN/proxy providers (very rough heuristic)
  private static readonly VPN_INDICATORS = [
    "amazonaws.com",
    "digitalocean.com",
    "linode.com",
    "vultr.com",
    "hetzner.com",
  ];

  // Helpers for safe parsing of unknown JSON
  private static isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object";
  }
  private static str(v: unknown, def = "Unknown"): string {
    return typeof v === "string" && v.length > 0 ? v : def;
  }
  private static num(v: unknown, def = 0): number {
    return typeof v === "number" ? v : def;
  }

  /** Analyze an IP for risk signals. Safe defaults on failure. */
  static async analyzeIP(ip: string): Promise<IPInfo> {
    try {
      const geoLocation = await this.getGeoLocation(ip);
      const isVPN = await this.detectVPN(ip);
      const isProxy = await this.detectProxy(ip);
      const isTor = await this.detectTor(ip);

      const riskScore = this.calculateIPRiskScore({
        ip,
        countryCode: geoLocation?.countryCode,
        isVPN,
        isProxy,
        isTor,
      });

      return {
        ip,
        country: geoLocation?.country,
        countryCode: geoLocation?.countryCode,
        region: geoLocation?.region,
        city: geoLocation?.city,
        latitude: geoLocation?.latitude,
        longitude: geoLocation?.longitude,
        timezone: geoLocation?.timezone,
        isVPN,
        isProxy,
        isTor,
        riskScore,
      };
    } catch (error) {
      console.error("IP analysis error:", error);
      return {
        ip,
        riskScore: 50,
        isVPN: false,
        isProxy: false,
        isTor: false,
      };
    }
  }

  /** Basic geo lookup with timeouts and safe fallbacks. */
  static async getGeoLocation(ip: string): Promise<GeoLocation | null> {
    try {
      if (this.isPrivateIP(ip)) {
        return {
          country: "Local",
          countryCode: "XX",
          region: "Local",
          city: "Local",
          latitude: 0,
          longitude: 0,
          timezone: "UTC",
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,proxy,hosting`,
        {
          signal: controller.signal,
          headers: { "User-Agent": "DY-Official/1.0" },
        }
      );
      clearTimeout(timeoutId);

      if (resp.ok) {
        const raw: unknown = await resp.json();
        if (this.isObject(raw) && this.str(raw["status"], "") === "success") {
          return {
            country: this.str(raw["country"]),
            countryCode: this.str(raw["countryCode"], "XX"),
            region: this.str(raw["regionName"] ?? raw["region"]),
            city: this.str(raw["city"]),
            latitude: this.num(raw["lat"]),
            longitude: this.num(raw["lon"]),
            timezone: this.str(raw["timezone"], "UTC"),
          };
        }
      }

      // Fallback provider
      const fbController = new AbortController();
      const fbTimeout = setTimeout(() => fbController.abort(), 5000);
      const fbResp = await fetch(`https://ipapi.co/${ip}/json/`, {
        signal: fbController.signal,
        headers: { "User-Agent": "DY-Official/1.0" },
      });
      clearTimeout(fbTimeout);
      if (fbResp.ok) {
        const fb: unknown = await fbResp.json();
        if (this.isObject(fb)) {
          return {
            country: this.str(fb["country_name"]),
            countryCode: this.str(fb["country_code"], "XX"),
            region: this.str(fb["region"]),
            city: this.str(fb["city"]),
            latitude: this.num(fb["latitude"]),
            longitude: this.num(fb["longitude"]),
            timezone: this.str(fb["timezone"], "UTC"),
          };
        }
      }

      return null;
    } catch (error) {
      console.warn(`Geolocation lookup failed for ${ip}:`, error);
      return null;
    }
  }

  static async detectVPN(ip: string): Promise<boolean> {
    try {
      const reverseDNS = await this.getReverseDNS(ip);
      if (reverseDNS) {
        return this.VPN_INDICATORS.some((d) => reverseDNS.includes(d));
      }
      return false;
    } catch (error) {
      console.error("VPN detection error:", error);
      return false;
    }
  }

  static async detectProxy(_ip: string): Promise<boolean> {
    // Placeholder for proxy detection
    return false;
  }

  static async detectTor(_ip: string): Promise<boolean> {
    // Placeholder for Tor detection
    return false;
  }

  static calculateIPRiskScore(data: {
    ip: string;
    countryCode?: string;
    isVPN?: boolean;
    isProxy?: boolean;
    isTor?: boolean;
  }): number {
    let score = 20; // base uncertainty
    if (
      data.countryCode &&
      this.HIGH_RISK_COUNTRIES.includes(data.countryCode)
    ) {
      score += 30;
    }
    if (data.isVPN) score += 25;
    if (data.isProxy) score += 30;
    if (data.isTor) score += 40;
    if (this.isPrivateIP(data.ip)) score = Math.max(0, score - 30);
    return Math.min(100, Math.max(0, score));
  }

  static isPrivateIP(ip: string): boolean {
    const ranges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
    ];
    return ranges.some((r) => r.test(ip));
  }

  static async getReverseDNS(_ip: string): Promise<string | null> {
    // Stubbed: return null in this environment
    return null;
  }

  static isBlockedCountry(
    countryCode: string,
    extraBlocked: string[] = []
  ): boolean {
    const defaultBlocked = ["KP", "SY"];
    const list = new Set([...defaultBlocked, ...extraBlocked]);
    return list.has(countryCode);
  }

  static extractIP(req: NextRequest): string {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
    const realIP = req.headers.get("x-real-ip");
    if (realIP) return realIP;
    const cfIP = req.headers.get("cf-connecting-ip");
    if (cfIP) return cfIP;
    return "unknown";
  }

  static createIPSecurityMiddleware(options: IPSecurityOptions = {}) {
    const {
      blockHighRisk = false,
      blockVPN = false,
      blockTor = false,
      blockCountries = [],
      riskThreshold = 80,
    } = options;

    return async (req: NextRequest): Promise<IPSecurityDecision> => {
      try {
        const ip = this.extractIP(req);
        const ipInfo = await this.analyzeIP(ip);

        if (blockHighRisk && ipInfo.riskScore >= riskThreshold) {
          return {
            blocked: true,
            reason: `High risk IP (${ipInfo.riskScore})`,
            ipInfo,
          };
        }
        if (blockVPN && ipInfo.isVPN) {
          return { blocked: true, reason: "VPN detected", ipInfo };
        }
        if (blockTor && ipInfo.isTor) {
          return { blocked: true, reason: "Tor exit node detected", ipInfo };
        }
        if (
          blockCountries.length > 0 &&
          ipInfo.countryCode &&
          blockCountries.includes(ipInfo.countryCode)
        ) {
          return {
            blocked: true,
            reason: `Blocked country ${ipInfo.countryCode}`,
            ipInfo,
          };
        }

        return { blocked: false, ipInfo };
      } catch (error) {
        console.error("IP security middleware error:", error);
        return {
          blocked: false,
          error: "IP security middleware error",
          ipInfo: {
            ip: "unknown",
            riskScore: 50,
            isVPN: false,
            isProxy: false,
            isTor: false,
          },
        };
      }
    };
  }

  static async getIPReputation(_ip: string): Promise<{
    reputation: "good" | "bad" | "unknown";
    sources: string[];
    details: string;
  }> {
    return {
      reputation: "unknown",
      sources: ["internal"],
      details: "No reputation data available",
    };
  }
}
