/**
 * Currency Service
 * Handles currency conversion, formatting, and geolocation-based currency detection
 */

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  rate: number; // Exchange rate relative to 1 USD (USD -> target). Base storage currency for the app is GBP.
}

// Canonical base currency for persisted priceCents values in the database.
export const BASE_CURRENCY = "GBP";

export const SUPPORTED_CURRENCIES: Record<string, Currency> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar", rate: 1 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", rate: 0.81 },
  CAD: { code: "CAD", symbol: "C$", name: "Canadian Dollar", rate: 1.36 },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar", rate: 1.53 },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen", rate: 149.5 },
  CHF: { code: "CHF", symbol: "CHF", name: "Swiss Franc", rate: 0.91 },
  SEK: { code: "SEK", symbol: "kr", name: "Swedish Krona", rate: 10.85 },
  NOK: { code: "NOK", symbol: "kr", name: "Norwegian Krone", rate: 10.68 },
  DKK: { code: "DKK", symbol: "kr", name: "Danish Krone", rate: 6.86 },
  PLN: { code: "PLN", symbol: "zł", name: "Polish Złoty", rate: 4.02 },
  CZK: { code: "CZK", symbol: "Kč", name: "Czech Koruna", rate: 23.1 },
  HUF: { code: "HUF", symbol: "Ft", name: "Hungarian Forint", rate: 364 },
  BGN: { code: "BGN", symbol: "лв", name: "Bulgarian Lev", rate: 1.8 },
  RON: { code: "RON", symbol: "lei", name: "Romanian Leu", rate: 4.57 },
  HRK: { code: "HRK", symbol: "kn", name: "Croatian Kuna", rate: 6.93 },
  NZD: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", rate: 1.64 },
  SGD: { code: "SGD", symbol: "S$", name: "Singapore Dollar", rate: 1.34 },
  HKD: { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", rate: 7.82 },
  MXN: { code: "MXN", symbol: "$", name: "Mexican Peso", rate: 17.1 },
  BRL: { code: "BRL", symbol: "R$", name: "Brazilian Real", rate: 5.02 },
  CNY: { code: "CNY", symbol: "¥", name: "Chinese Yuan", rate: 7.24 },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", rate: 83.2 },
  KRW: { code: "KRW", symbol: "₩", name: "South Korean Won", rate: 1342 },
  RUB: { code: "RUB", symbol: "₽", name: "Russian Ruble", rate: 96.4 },
  TRY: { code: "TRY", symbol: "₺", name: "Turkish Lira", rate: 27.1 },
  ZAR: { code: "ZAR", symbol: "R", name: "South African Rand", rate: 18.7 },
  THB: { code: "THB", symbol: "฿", name: "Thai Baht", rate: 35.8 },
  MYR: { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", rate: 4.68 },
  IDR: { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", rate: 15420 },
  PHP: { code: "PHP", symbol: "₱", name: "Philippine Peso", rate: 56.2 },
  VND: { code: "VND", symbol: "₫", name: "Vietnamese Dong", rate: 24380 },
  AED: { code: "AED", symbol: "د.إ", name: "UAE Dirham", rate: 3.67 },
  SAR: { code: "SAR", symbol: "﷼", name: "Saudi Riyal", rate: 3.75 },
  QAR: { code: "QAR", symbol: "﷼", name: "Qatari Riyal", rate: 3.64 },
  KWD: { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar", rate: 0.31 },
  BHD: { code: "BHD", symbol: "د.ب", name: "Bahraini Dinar", rate: 0.38 },
  OMR: { code: "OMR", symbol: "﷼", name: "Omani Rial", rate: 0.38 },
  JOD: { code: "JOD", symbol: "د.ا", name: "Jordanian Dinar", rate: 0.71 },
  LBP: { code: "LBP", symbol: "ل.ل", name: "Lebanese Pound", rate: 15000 },
  EGP: { code: "EGP", symbol: "£", name: "Egyptian Pound", rate: 30.9 },
  ILS: { code: "ILS", symbol: "₪", name: "Israeli Shekel", rate: 3.74 },
};

// Country to currency mapping
export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // Europe
  AT: "EUR",
  BE: "EUR",
  BG: "BGN",
  HR: "HRK",
  CY: "EUR",
  CZ: "CZK",
  DK: "DKK",
  EE: "EUR",
  FI: "EUR",
  FR: "EUR",
  DE: "EUR",
  GR: "EUR",
  HU: "HUF",
  IE: "EUR",
  IT: "EUR",
  LV: "EUR",
  LT: "EUR",
  LU: "EUR",
  MT: "EUR",
  NL: "EUR",
  PL: "PLN",
  PT: "EUR",
  RO: "RON",
  SK: "EUR",
  SI: "EUR",
  ES: "EUR",
  SE: "SEK",
  NO: "NOK",
  CH: "CHF",
  IS: "EUR",
  LI: "CHF",
  MC: "EUR",
  SM: "EUR",
  VA: "EUR",
  AD: "EUR",

  // Americas
  US: "USD",
  CA: "CAD",
  MX: "MXN",
  BR: "BRL",
  AR: "USD",
  CL: "USD",
  CO: "USD",
  PE: "USD",
  EC: "USD",
  BO: "USD",
  PY: "USD",
  UY: "USD",
  VE: "USD",
  GY: "USD",
  SR: "USD",
  GF: "EUR",
  FK: "GBP",

  // Asia Pacific
  AU: "AUD",
  NZ: "NZD",
  JP: "JPY",
  CN: "CNY",
  IN: "INR",
  KR: "KRW",
  SG: "SGD",
  HK: "HKD",
  TW: "USD",
  TH: "THB",
  MY: "MYR",
  ID: "IDR",
  PH: "PHP",
  VN: "VND",
  KH: "USD",
  LA: "USD",
  MM: "USD",
  BD: "USD",
  PK: "USD",
  LK: "USD",
  NP: "USD",
  BT: "USD",
  MV: "USD",
  AF: "USD",

  // Middle East & Africa
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
  KW: "KWD",
  BH: "BHD",
  OM: "OMR",
  JO: "JOD",
  LB: "LBP",
  EG: "EGP",
  IL: "ILS",
  TR: "TRY",
  IR: "USD",
  IQ: "USD",
  SY: "USD",
  YE: "USD",
  ZA: "ZAR",
  NG: "USD",
  KE: "USD",
  GH: "USD",
  ET: "USD",
  TZ: "USD",
  UG: "USD",
  RW: "USD",
  MA: "USD",
  DZ: "USD",
  TN: "USD",
  LY: "USD",
  SD: "USD",
  AO: "USD",
  MZ: "USD",

  // Others
  RU: "RUB",
  UA: "USD",
  BY: "USD",
  MD: "USD",
  GE: "USD",
  AM: "USD",
  AZ: "USD",
  KZ: "USD",
  KG: "USD",
  TJ: "USD",
  TM: "USD",
  UZ: "USD",
  MN: "USD",
  KP: "USD",

  // Default fallback
  GB: "GBP",
};

export class CurrencyService {
  private static instance: CurrencyService;
  private exchangeRates: Record<string, number> = {};
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }

  /**
   * Detect user's country using multiple methods
   */
  async detectUserCountry(): Promise<string> {
    try {
      // Method 1: Try Geolocation API
      const geoCountry = await this.getCountryFromGeolocation();
      if (geoCountry) return geoCountry;

      // Method 2: Try IP-based detection
      const ipCountry = await this.getCountryFromIP();
      if (ipCountry) return ipCountry;

      // Method 3: Browser locale fallback
      const localeCountry = this.getCountryFromLocale();
      if (localeCountry) return localeCountry;

      // Default fallback
      return "GB";
    } catch (error) {
      console.error("Error:", error);
      console.warn("Failed to detect user country:", error);
      return "GB";
    }
  }

  /**
   * Get country from browser geolocation
   */
  private async getCountryFromGeolocation(): Promise<string | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const data = await response.json();
            resolve(data.countryCode || null);
          } catch {
            resolve(null);
          }
        },
        () => resolve(null),
        { timeout: 5000 }
      );
    });
  }

  /**
   * Get country from IP address
   */
  private async getCountryFromIP(): Promise<string | null> {
    try {
      const response = await fetch("https://ipapi.co/country_code/");
      const countryCode = await response.text();
      return countryCode.trim().toUpperCase();
    } catch {
      return null;
    }
  }

  /**
   * Get country from browser locale
   */
  private getCountryFromLocale(): string | null {
    try {
      const locale = navigator.language || navigator.languages[0];
      const parts = locale.split("-");
      if (parts.length > 1) {
        return parts[1].toUpperCase();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get currency for a country
   */
  getCurrencyForCountry(countryCode: string): string {
    return COUNTRY_CURRENCY_MAP[countryCode] || "GBP";
  }

  /**
   * Detect user's preferred currency
   */
  async detectUserCurrency(): Promise<string> {
    const country = await this.detectUserCountry();
    return this.getCurrencyForCountry(country);
  }

  /**
   * Convert price from the base currency (GBP cents) to the target currency.
   *
   * NOTE: The static exchange rates are defined relative to USD (1 USD = rate targetCurrency),
   * but our persisted amounts are GBP. To convert we:
   *   1. Convert GBP -> USD: usdAmount = gbpAmount / GBP.rate  (because 1 USD = GBP.rate GBP)
   *   2. Convert USD -> target: targetAmount = usdAmount * target.rate
   * If target is GBP we just return the original amount.
   */
  convertPrice(gbpCents: number, targetCurrency: string): number {
    if (targetCurrency === BASE_CURRENCY) return gbpCents;

    const target = SUPPORTED_CURRENCIES[targetCurrency];
    const gbp = SUPPORTED_CURRENCIES[BASE_CURRENCY];
    if (!target) {
      console.warn(`Unsupported currency: ${targetCurrency}`);
      return gbpCents;
    }
    if (!gbp) {
      console.warn("GBP rate missing; falling back to identity conversion");
      return gbpCents;
    }
    const gbpAmount = gbpCents / 100; // in pounds
    const usdAmount = gbpAmount / gbp.rate; // GBP -> USD
    const targetAmount = usdAmount * target.rate; // USD -> target
    return Math.round(targetAmount * 100);
  }

  /**
   * Format price with currency symbol and locale
   */
  formatPrice(cents: number, currencyCode: string, locale?: string): string {
    const currency = SUPPORTED_CURRENCIES[currencyCode];
    if (!currency) {
      return `$${(cents / 100).toFixed(2)}`;
    }

    const amount = cents / 100;

    // Use Intl.NumberFormat for proper locale formatting
    try {
      const formatter = new Intl.NumberFormat(locale || "en-US", {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits:
          currencyCode === "JPY" || currencyCode === "KRW" ? 0 : 2,
        maximumFractionDigits:
          currencyCode === "JPY" || currencyCode === "KRW" ? 0 : 2,
      });
      return formatter.format(amount);
    } catch {
      // Fallback to manual formatting
      if (currencyCode === "JPY" || currencyCode === "KRW") {
        return `${currency.symbol}${Math.round(amount).toLocaleString()}`;
      }
      return `${currency.symbol}${amount.toFixed(2)}`;
    }
  }

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies(): Currency[] {
    return Object.values(SUPPORTED_CURRENCIES);
  }

  /**
   * Update exchange rates (you could integrate with a real API)
   */
  async updateExchangeRates(): Promise<void> {
    const now = Date.now();
    if (now - this.lastFetchTime < this.CACHE_DURATION) {
      return; // Use cached rates
    }

    try {
      // You can integrate with a real exchange rate API here
      // For now, we'll use static rates
      this.exchangeRates = Object.fromEntries(
        Object.entries(SUPPORTED_CURRENCIES).map(([code, currency]) => [
          code,
          currency.rate,
        ])
      );
      this.lastFetchTime = now;
    } catch (error) {
      console.error("Error:", error);
      console.warn("Failed to update exchange rates:", error);
    }
  }
}

export const currencyService = CurrencyService.getInstance();
