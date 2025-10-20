import { prisma } from "./prisma";

export interface ContentPageData {
  id: string;
  slug: string;
  title: string;
  type: string;
  isActive: boolean;
  sections: ContentSectionData[];
}

export interface ContentSectionData {
  id: string;
  type: string;
  title?: string | null;
  subtitle?: string | null;
  content?: Record<string, unknown> | null; // Parsed JSON content
  imageUrl?: string | null;
  buttonText?: string | null;
  buttonLink?: string | null;
  order: number;
  isVisible: boolean;
}

export interface SiteSettingsData {
  [key: string]: string | number | boolean;
}

export class CMSService {
  /**
   * Get a page by slug with all its sections
   */
  static async getPage(slug: string): Promise<ContentPageData | null> {
    const page = await prisma.contentPage.findUnique({
      where: { slug, isActive: true },
      include: {
        sections: {
          where: { isVisible: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!page) return null;

    return {
      ...page,
      sections: page.sections.map((section) => ({
        ...section,
        content: section.content ? JSON.parse(section.content) : null,
      })),
    };
  }

  /**
   * Get all pages for admin management
   */
  static async getAllPages(): Promise<ContentPageData[]> {
    const pages = await prisma.contentPage.findMany({
      include: {
        sections: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return pages.map((page) => ({
      ...page,
      sections: page.sections.map((section) => ({
        ...section,
        content: section.content ? JSON.parse(section.content) : null,
      })),
    }));
  }

  /**
   * Create or update a page
   */
  static async savePage(pageData: {
    id?: string;
    slug: string;
    title: string;
    type: string;
    isActive?: boolean;
    sections: Array<{
      id?: string;
      type: string;
      title?: string;
      subtitle?: string;
      content?: Record<string, unknown> | null;
      imageUrl?: string;
      buttonText?: string;
      buttonLink?: string;
      order: number;
      isVisible?: boolean;
    }>;
  }): Promise<ContentPageData> {
    const { sections, ...page } = pageData;

    // Create or update page
    const savedPage = await prisma.contentPage.upsert({
      where: { id: pageData.id || "" },
      create: {
        slug: page.slug,
        title: page.title,
        type: page.type,
        isActive: page.isActive ?? true,
      },
      update: {
        slug: page.slug,
        title: page.title,
        type: page.type,
        isActive: page.isActive ?? true,
      },
      include: { sections: true },
    });

    // Delete existing sections and create new ones
    await prisma.contentSection.deleteMany({
      where: { pageId: savedPage.id },
    });

    if (sections.length > 0) {
      await prisma.contentSection.createMany({
        data: sections.map((section) => ({
          pageId: savedPage.id,
          type: section.type,
          title: section.title,
          subtitle: section.subtitle,
          content: section.content ? JSON.stringify(section.content) : null,
          imageUrl: section.imageUrl,
          buttonText: section.buttonText,
          buttonLink: section.buttonLink,
          order: section.order,
          isVisible: section.isVisible ?? true,
        })),
      });
    }

    return this.getPage(savedPage.slug) as Promise<ContentPageData>;
  }

  /**
   * Delete a page
   */
  static async deletePage(id: string): Promise<boolean> {
    try {
      await prisma.contentPage.delete({
        where: { id },
      });
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get all site settings
   */
  static async getSiteSettings(): Promise<SiteSettingsData> {
    const settings = await prisma.siteSettings.findMany();

    const settingsObject: SiteSettingsData = {};
    settings.forEach((setting) => {
      let value: string | number | boolean = setting.value;

      // Parse value based on type
      switch (setting.type) {
        case "number":
          value = parseFloat(setting.value);
          break;
        case "boolean":
          value = setting.value === "true";
          break;
        case "json":
          try {
            value = JSON.parse(setting.value);
          } catch {
            value = setting.value;
          }
          break;
        default:
          value = setting.value;
      }

      settingsObject[setting.key] = value;
    });

    return settingsObject;
  }

  /**
   * Update site settings
   */
  static async updateSiteSettings(
    settings: Record<string, unknown>
  ): Promise<SiteSettingsData> {
    for (const [key, value] of Object.entries(settings)) {
      const stringValue =
        typeof value === "object" ? JSON.stringify(value) : String(value);

      await prisma.siteSettings.upsert({
        where: { key },
        create: {
          key,
          value: stringValue,
          type:
            typeof value === "number"
              ? "number"
              : typeof value === "boolean"
              ? "boolean"
              : typeof value === "object"
              ? "json"
              : "text",
        },
        update: {
          value: stringValue,
        },
      });
    }

    return this.getSiteSettings();
  }

  /**
   * Get landing page content for frontend
   */
  static async getLandingPageContent(): Promise<{
    hero?: Record<string, unknown> | null;
    features?: Record<string, unknown> | null;
    reviews?: Record<string, unknown> | null;
    sections: ContentSectionData[];
    settings: SiteSettingsData;
  }> {
    const [page, settings] = await Promise.all([
      this.getPage("home"),
      this.getSiteSettings(),
    ]);

    if (!page) {
      return { sections: [], settings };
    }

    // Extract common sections for easier access
    const hero = page.sections.find((s) => s.type === "hero")?.content;
    const features = page.sections.find((s) => s.type === "features")?.content;
    const reviews = page.sections.find((s) => s.type === "reviews")?.content;

    return {
      hero,
      features,
      reviews,
      sections: page.sections,
      settings,
    };
  }

  /**
   * Preview content changes without saving
   */
  static async previewPage(
    pageData: ContentPageData
  ): Promise<ContentPageData> {
    return {
      ...pageData,
      sections: pageData.sections.map((section: ContentSectionData) => ({
        ...section,
        content:
          typeof section.content === "string"
            ? JSON.parse(section.content)
            : section.content,
      })),
    };
  }

  /**
   * Get home page images for frontend
   */
  static async getHomePageImages(): Promise<{
    heroImages: { left: string; right: string };
    categoryImages: Record<string, string>;
  }> {
    const settings = await this.getSiteSettings();

    return {
      heroImages: {
        left:
          (settings.heroImageLeft as string) ||
          "https://picsum.photos/900/1200",
        right:
          (settings.heroImageRight as string) ||
          "https://picsum.photos/901/1200",
      },
      categoryImages: {
        denim:
          (settings.categoryImageDenim as string) ||
          "https://picsum.photos/seed/denim/800/1000",
        shoes:
          (settings.categoryImageShoes as string) ||
          "https://picsum.photos/seed/shoes/800/1000",
        accessories:
          (settings.categoryImageAccessories as string) ||
          "https://picsum.photos/seed/accessories/800/1000",
        sportswear:
          (settings.categoryImageSportswear as string) ||
          "https://picsum.photos/seed/sportswear/800/1000",
        dresses:
          (settings.categoryImageDresses as string) ||
          "https://picsum.photos/seed/dresses/800/1000",
        brands:
          (settings.categoryImageBrands as string) ||
          "https://picsum.photos/seed/brands/800/1000",
        newIn:
          (settings.categoryImageNewIn as string) ||
          "https://picsum.photos/seed/newin/1200/600",
      },
    };
  }

  /**
   * Update home page images
   */
  static async updateHomePageImages(images: {
    heroImageLeft?: string;
    heroImageRight?: string;
    categoryImages?: Record<string, string>;
  }): Promise<void> {
    const updateData: Record<string, string> = {};

    // Validate and sanitize image URLs
    const validateImageUrl = (url: string): boolean => {
      if (!url) return false;
      try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
      } catch {
        return false;
      }
    };

    if (images.heroImageLeft) {
      if (!validateImageUrl(images.heroImageLeft)) {
        throw new Error("Invalid hero left image URL");
      }
      updateData.heroImageLeft = images.heroImageLeft.trim();
    }

    if (images.heroImageRight) {
      if (!validateImageUrl(images.heroImageRight)) {
        throw new Error("Invalid hero right image URL");
      }
      updateData.heroImageRight = images.heroImageRight.trim();
    }

    if (images.categoryImages) {
      const validCategories = [
        "denim",
        "shoes",
        "accessories",
        "sportswear",
        "dresses",
        "brands",
        "newIn",
      ];

      Object.entries(images.categoryImages).forEach(([category, imageUrl]) => {
        if (!validCategories.includes(category)) {
          throw new Error(`Invalid category: ${category}`);
        }

        if (imageUrl && !validateImageUrl(imageUrl)) {
          throw new Error(`Invalid image URL for category ${category}`);
        }

        if (imageUrl) {
          updateData[
            `categoryImage${
              category.charAt(0).toUpperCase() + category.slice(1)
            }`
          ] = imageUrl.trim();
        }
      });
    }

    if (Object.keys(updateData).length > 0) {
      await this.updateSiteSettings(updateData);
    }
  }

  /**
   * Reset homepage images to defaults
   */
  static async resetHomepageImagesToDefault(): Promise<void> {
    const defaultImages = {
      heroImageLeft:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900&h=1200&fit=crop",
      heroImageRight:
        "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=900&h=1200&fit=crop",
      categoryImageDenim:
        "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=1000&fit=crop",
      categoryImageShoes:
        "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=1000&fit=crop",
      categoryImageAccessories:
        "https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=800&h=1000&fit=crop",
      categoryImageSportswear:
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=1000&fit=crop",
      categoryImageDresses:
        "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=1000&fit=crop",
      categoryImageBrands:
        "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=800&h=1000&fit=crop",
      categoryImageNewIn:
        "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1200&h=600&fit=crop",
    };

    await this.updateSiteSettings(defaultImages);
  }

  /**
   * Get logo settings for the application
   */
  static async getLogoSettings(): Promise<{
    logoText?: string;
    logoImageUrl?: string;
    logoType: "text" | "image" | "combined";
    logoTextPrefix?: string;
    logoTextSuffix?: string;
    logoAccentColor?: string;
  }> {
    const settings = await this.getSiteSettings();

    return {
      logoText: (settings.logoText as string) || "NVRSTL",
      logoImageUrl: (settings.logoImageUrl as string) || undefined,
      logoType: (settings.logoType as "text" | "image" | "combined") || "text",
      logoTextPrefix: (settings.logoTextPrefix as string) || "DY",
      logoTextSuffix: (settings.logoTextSuffix as string) || "OFFICIALETTE",
      logoAccentColor: (settings.logoAccentColor as string) || "#DC2626", // red-600
    };
  }

  /**
   * Update logo settings
   */
  static async updateLogoSettings(logoData: {
    logoText?: string;
    logoImageUrl?: string;
    logoType?: "text" | "image" | "combined";
    logoTextPrefix?: string;
    logoTextSuffix?: string;
    logoAccentColor?: string;
  }): Promise<void> {
    const updateData: Record<string, string | boolean> = {};

    // Validate and sanitize logo data
    if (logoData.logoImageUrl) {
      const validateImageUrl = (url: string): boolean => {
        if (!url) return false;
        try {
          const parsed = new URL(url);
          return parsed.protocol === "https:" || parsed.protocol === "http:";
        } catch {
          return false;
        }
      };

      if (!validateImageUrl(logoData.logoImageUrl)) {
        throw new Error("Invalid logo image URL");
      }
      updateData.logoImageUrl = logoData.logoImageUrl.trim();
    }

    if (logoData.logoText) {
      if (logoData.logoText.length > 50) {
        throw new Error("Logo text must be 50 characters or less");
      }
      updateData.logoText = logoData.logoText.trim();
    }

    if (
      logoData.logoType &&
      ["text", "image", "combined"].includes(logoData.logoType)
    ) {
      updateData.logoType = logoData.logoType;
    }

    if (logoData.logoTextPrefix) {
      if (logoData.logoTextPrefix.length > 20) {
        throw new Error("Logo text prefix must be 20 characters or less");
      }
      updateData.logoTextPrefix = logoData.logoTextPrefix.trim();
    }

    if (logoData.logoTextSuffix) {
      if (logoData.logoTextSuffix.length > 30) {
        throw new Error("Logo text suffix must be 30 characters or less");
      }
      updateData.logoTextSuffix = logoData.logoTextSuffix.trim();
    }

    if (logoData.logoAccentColor) {
      // Validate hex color
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexColorRegex.test(logoData.logoAccentColor)) {
        throw new Error(
          "Logo accent color must be a valid hex color (e.g., #FF0000)"
        );
      }
      updateData.logoAccentColor = logoData.logoAccentColor;
    }

    if (Object.keys(updateData).length > 0) {
      await this.updateSiteSettings(updateData);
    }
  }

  /**
   * Reset logo to default settings
   */
  static async resetLogoToDefault(): Promise<void> {
    const defaultLogo = {
      logoText: "NVRSTL",
      logoImageUrl: null,
      logoType: "text" as const,
      logoTextPrefix: "DY",
      logoTextSuffix: "OFFICIALETTE",
      logoAccentColor: "#DC2626", // red-600
    };

    await this.updateSiteSettings(defaultLogo);
  }

  /**
   * Get image placeholder for category
   */
  static getImagePlaceholder(
    category: string,
    width: number = 800,
    height: number = 1000
  ): string {
    const seed = category.toLowerCase();
    return `https://picsum.photos/seed/${seed}/${width}/${height}`;
  }
}

export default CMSService;
