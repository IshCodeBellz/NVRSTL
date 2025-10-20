// System Settings Service - Configuration management
import { prisma } from "@/lib/server/prisma";

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  type: "string" | "number" | "boolean" | "json";
  category: string;
  description?: string;
  isPublic: boolean;
  lastModified: Date;
  modifiedBy: string;
}

export interface SystemStats {
  totalSettings: number;
  publicSettings: number;
  privateSettings: number;
  categories: number;
  lastModified: Date | null;
}

export class SystemSettingsService {
  // Get all settings
  static async getAllSettings(): Promise<SystemSetting[]> {
    try {
      const settings = await prisma.systemSettings.findMany({
        orderBy: [{ category: "asc" }, { key: "asc" }],
      });

      return settings.map((setting) => ({
        id: setting.id,
        key: setting.key,
        value: setting.value,
        type: setting.type as "string" | "number" | "boolean" | "json",
        category: setting.category,
        description: setting.description || undefined,
        isPublic: setting.isPublic,
        lastModified: setting.lastModified,
        modifiedBy: setting.modifiedBy,
      }));
    } catch (error) {
      console.error("Error fetching settings:", error);
      return [];
    }
  }

  // Get settings by category
  static async getSettingsByCategory(
    category: string
  ): Promise<SystemSetting[]> {
    try {
      const settings = await prisma.systemSettings.findMany({
        where: { category },
        orderBy: { key: "asc" },
      });

      return settings.map((setting) => ({
        id: setting.id,
        key: setting.key,
        value: setting.value,
        type: setting.type as "string" | "number" | "boolean" | "json",
        category: setting.category,
        description: setting.description || undefined,
        isPublic: setting.isPublic,
        lastModified: setting.lastModified,
        modifiedBy: setting.modifiedBy,
      }));
    } catch (error) {
      console.error("Error fetching settings by category:", error);
      return [];
    }
  }

  // Get a specific setting
  static async getSetting(key: string): Promise<SystemSetting | null> {
    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { key },
      });

      if (!setting) return null;

      return {
        id: setting.id,
        key: setting.key,
        value: setting.value,
        type: setting.type as "string" | "number" | "boolean" | "json",
        category: setting.category,
        description: setting.description || undefined,
        isPublic: setting.isPublic,
        lastModified: setting.lastModified,
        modifiedBy: setting.modifiedBy,
      };
    } catch (error) {
      console.error("Error fetching setting:", error);
      return null;
    }
  }

  // Get setting value with type conversion
  static async getSettingValue<T = unknown>(
    key: string,
    defaultValue?: T
  ): Promise<T> {
    try {
      const setting = await this.getSetting(key);
      if (!setting) return defaultValue as T;

      switch (setting.type) {
        case "boolean":
          return (setting.value === "true") as T;
        case "number":
          return Number(setting.value) as T;
        case "json":
          return JSON.parse(setting.value) as T;
        default:
          return setting.value as T;
      }
    } catch (error) {
      console.error("Error getting setting value:", error);
      return defaultValue as T;
    }
  }

  // Create or update a setting
  static async setSetting(
    key: string,
    value: string | number | boolean | object,
    type: "string" | "number" | "boolean" | "json",
    category: string,
    modifiedBy: string,
    options?: {
      description?: string;
      isPublic?: boolean;
    }
  ): Promise<SystemSetting | null> {
    try {
      let stringValue: string;

      switch (type) {
        case "boolean":
          stringValue = String(Boolean(value));
          break;
        case "number":
          stringValue = String(Number(value));
          break;
        case "json":
          stringValue = JSON.stringify(value);
          break;
        default:
          stringValue = String(value);
      }

      const setting = await prisma.systemSettings.upsert({
        where: { key },
        update: {
          value: stringValue,
          type,
          category,
          description: options?.description,
          isPublic: options?.isPublic ?? false,
          lastModified: new Date(),
          modifiedBy,
        },
        create: {
          key,
          value: stringValue,
          type,
          category,
          description: options?.description,
          isPublic: options?.isPublic ?? false,
          modifiedBy,
        },
      });

      return {
        id: setting.id,
        key: setting.key,
        value: setting.value,
        type: setting.type as "string" | "number" | "boolean" | "json",
        category: setting.category,
        description: setting.description || undefined,
        isPublic: setting.isPublic,
        lastModified: setting.lastModified,
        modifiedBy: setting.modifiedBy,
      };
    } catch (error) {
      console.error("Error setting configuration:", error);
      return null;
    }
  }

  // Delete a setting
  static async deleteSetting(key: string): Promise<boolean> {
    try {
      await prisma.systemSettings.delete({
        where: { key },
      });
      return true;
    } catch (error) {
      console.error("Error deleting setting:", error);
      return false;
    }
  }

  // Get all categories
  static async getCategories(): Promise<string[]> {
    try {
      const categories = await prisma.systemSettings.findMany({
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
      });

      return categories.map((c) => c.category);
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  }

  // Get system statistics
  static async getSystemStats(): Promise<SystemStats> {
    try {
      const [
        totalSettings,
        publicSettings,
        privateSettings,
        categories,
        lastModifiedSetting,
      ] = await Promise.all([
        prisma.systemSettings.count(),
        prisma.systemSettings.count({ where: { isPublic: true } }),
        prisma.systemSettings.count({ where: { isPublic: false } }),
        prisma.systemSettings.findMany({
          select: { category: true },
          distinct: ["category"],
        }),
        prisma.systemSettings.findFirst({
          orderBy: { lastModified: "desc" },
          select: { lastModified: true },
        }),
      ]);

      return {
        totalSettings,
        publicSettings,
        privateSettings,
        categories: categories.length,
        lastModified: lastModifiedSetting?.lastModified || null,
      };
    } catch (error) {
      console.error("Error fetching system stats:", error);
      return {
        totalSettings: 0,
        publicSettings: 0,
        privateSettings: 0,
        categories: 0,
        lastModified: null,
      };
    }
  }

  // Initialize default settings
  static async initializeDefaultSettings(modifiedBy: string): Promise<void> {
    const defaultSettings = [
      // Site Configuration
      {
        key: "site.name",
        value: "DY Official Store",
        type: "string" as const,
        category: "site",
        description: "Site name displayed in headers and titles",
        isPublic: true,
      },
      {
        key: "site.description",
        value: "Premium fashion and lifestyle products",
        type: "string" as const,
        category: "site",
        description: "Site description for SEO",
        isPublic: true,
      },
      {
        key: "site.maintenance_mode",
        value: false,
        type: "boolean" as const,
        category: "site",
        description: "Enable maintenance mode to disable public access",
        isPublic: false,
      },

      // E-commerce Settings
      {
        key: "ecommerce.default_currency",
        value: "USD",
        type: "string" as const,
        category: "ecommerce",
        description: "Default currency for pricing",
        isPublic: true,
      },
      {
        key: "ecommerce.tax_rate",
        value: 0.08,
        type: "number" as const,
        category: "ecommerce",
        description: "Default tax rate (0.08 = 8%)",
        isPublic: false,
      },
      {
        key: "ecommerce.shipping_threshold",
        value: 50,
        type: "number" as const,
        category: "ecommerce",
        description: "Free shipping threshold amount",
        isPublic: true,
      },

      // Security Settings
      {
        key: "security.max_login_attempts",
        value: 5,
        type: "number" as const,
        category: "security",
        description: "Maximum login attempts before account lockout",
        isPublic: false,
      },
      {
        key: "security.session_timeout",
        value: 3600,
        type: "number" as const,
        category: "security",
        description: "Session timeout in seconds",
        isPublic: false,
      },
      {
        key: "security.require_mfa",
        value: false,
        type: "boolean" as const,
        category: "security",
        description: "Require multi-factor authentication for all users",
        isPublic: false,
      },

      // Email Settings
      {
        key: "email.from_address",
        value: "noreply@dyofficial.com",
        type: "string" as const,
        category: "email",
        description: "Default from email address",
        isPublic: false,
      },
      {
        key: "email.smtp_enabled",
        value: true,
        type: "boolean" as const,
        category: "email",
        description: "Enable SMTP email sending",
        isPublic: false,
      },

      // Analytics Settings
      {
        key: "analytics.google_analytics_id",
        value: "",
        type: "string" as const,
        category: "analytics",
        description: "Google Analytics tracking ID",
        isPublic: true,
      },
      {
        key: "analytics.data_retention_days",
        value: 90,
        type: "number" as const,
        category: "analytics",
        description: "Days to retain analytics data",
        isPublic: false,
      },

      // Feature Flags
      {
        key: "features.wishlist_enabled",
        value: true,
        type: "boolean" as const,
        category: "features",
        description: "Enable wishlist functionality",
        isPublic: true,
      },
      {
        key: "features.reviews_enabled",
        value: true,
        type: "boolean" as const,
        category: "features",
        description: "Enable product reviews",
        isPublic: true,
      },
      {
        key: "features.social_login_enabled",
        value: true,
        type: "boolean" as const,
        category: "features",
        description: "Enable social media login",
        isPublic: true,
      },
      {
        key: "features.hide_zero_product_brands",
        value: false,
        type: "boolean" as const,
        category: "features",
        description:
          "Hide brands that currently have no active products on the public Brands page",
        isPublic: true,
      },
    ];

    try {
      for (const setting of defaultSettings) {
        await this.setSetting(
          setting.key,
          setting.value,
          setting.type,
          setting.category,
          modifiedBy,
          {
            description: setting.description,
            isPublic: setting.isPublic,
          }
        );
      }
      console.log("Default settings initialized successfully");
    } catch (error) {
      console.error("Error initializing default settings:", error);
    }
  }

  // Bulk update settings
  static async bulkUpdateSettings(
    updates: Array<{
      key: string;
      value: string | number | boolean | object;
      type?: "string" | "number" | "boolean" | "json";
    }>,
    modifiedBy: string
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const update of updates) {
      try {
        const existingSetting = await this.getSetting(update.key);
        if (existingSetting) {
          await this.setSetting(
            update.key,
            update.value,
            update.type || existingSetting.type,
            existingSetting.category,
            modifiedBy,
            {
              description: existingSetting.description,
              isPublic: existingSetting.isPublic,
            }
          );
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Error updating setting ${update.key}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }

  // Export settings
  static async exportSettings(): Promise<{
    exportedAt: string;
    totalSettings: number;
    settings: Array<{
      key: string;
      value: string;
      type: string;
      category: string;
      description: string | undefined;
      isPublic: boolean;
    }>;
  } | null> {
    try {
      const settings = await this.getAllSettings();
      return {
        exportedAt: new Date().toISOString(),
        totalSettings: settings.length,
        settings: settings.map((s) => ({
          key: s.key,
          value: s.value,
          type: s.type,
          category: s.category,
          description: s.description,
          isPublic: s.isPublic,
        })),
      };
    } catch (error) {
      console.error("Error exporting settings:", error);
      return null;
    }
  }
}
