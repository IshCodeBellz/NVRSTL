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

export interface CategorySectionData {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
  cards: CategoryCardData[];
}

export interface CategoryCardData {
  id: string;
  sectionId: string;
  title: string;
  slug: string;
  imageUrl?: string | null;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
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
    } catch {
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
    heroLayout: "two-image" | "single-image";
    categoryImages: Record<string, string>;
    categoryLabels: Record<string, string>;
    categorySlugs: Record<string, string>;
    leagueTitle: string;
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
      heroLayout:
        (settings.heroLayout as "two-image" | "single-image") || "two-image",
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
      categoryLabels: {
        denim: (settings.categoryLabelDenim as string) || "Denim",
        shoes: (settings.categoryLabelShoes as string) || "Shoes",
        accessories:
          (settings.categoryLabelAccessories as string) || "Accessories",
        sportswear:
          (settings.categoryLabelSportswear as string) || "Sportswear",
        dresses: (settings.categoryLabelDresses as string) || "Dresses",
        brands: (settings.categoryLabelBrands as string) || "Brands",
      },
      categorySlugs: {
        denim: (settings.categorySlugDenim as string) || "denim",
        shoes: (settings.categorySlugShoes as string) || "footwear",
        accessories:
          (settings.categorySlugAccessories as string) || "accessories",
        sportswear: (settings.categorySlugSportswear as string) || "sportswear",
        dresses: (settings.categorySlugDresses as string) || "dresses",
        brands: (settings.categorySlugBrands as string) || "brands",
      },
      leagueTitle: (settings.leagueTitle as string) || "League",
    };
  }

  /**
   * Update home page images
   */
  static async updateHomePageImages(images: {
    heroImageLeft?: string;
    heroImageRight?: string;
    heroLayout?: "two-image" | "single-image";
    categoryImages?: Record<string, string>;
    categoryLabels?: Record<string, string>;
    categorySlugs?: Record<string, string>;
    leagueTitle?: string;
  }): Promise<void> {
    const updateData: Record<string, string> = {};

    // Validate and sanitize image URLs
    const validateImageUrl = (url: string): boolean => {
      if (!url || url.trim() === "") return false;
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

    // Process category labels
    if (images.categoryLabels) {
      const validCategories = [
        "denim",
        "shoes",
        "accessories",
        "sportswear",
        "dresses",
        "brands",
      ];

      Object.entries(images.categoryLabels).forEach(([category, label]) => {
        if (!validCategories.includes(category)) {
          throw new Error(`Invalid category: ${category}`);
        }

        if (label && label.length > 50) {
          throw new Error(
            `Category label for ${category} must be 50 characters or less`
          );
        }

        if (label) {
          updateData[
            `categoryLabel${
              category.charAt(0).toUpperCase() + category.slice(1)
            }`
          ] = label.trim();
        }
      });
    }

    // Process category slugs
    if (images.categorySlugs) {
      const validCategories = [
        "denim",
        "shoes",
        "accessories",
        "sportswear",
        "dresses",
        "brands",
      ];

      Object.entries(images.categorySlugs).forEach(([category, slug]) => {
        if (!validCategories.includes(category)) {
          throw new Error(`Invalid category: ${category}`);
        }

        if (slug && slug.length > 50) {
          throw new Error(
            `Category slug for ${category} must be 50 characters or less`
          );
        }

        if (slug) {
          // Validate slug format (alphanumeric, hyphens, underscores only)
          const slugRegex = /^[a-z0-9-_]+$/;
          if (!slugRegex.test(slug)) {
            throw new Error(
              `Category slug for ${category} must contain only lowercase letters, numbers, hyphens, and underscores`
            );
          }

          updateData[
            `categorySlug${
              category.charAt(0).toUpperCase() + category.slice(1)
            }`
          ] = slug.trim();
        }
      });
    }

    if (images.leagueTitle) {
      if (images.leagueTitle.length > 50) {
        throw new Error("League title must be 50 characters or less");
      }
      updateData.leagueTitle = images.leagueTitle.trim();
    }

    if (images.heroLayout) {
      if (!["two-image", "single-image"].includes(images.heroLayout)) {
        throw new Error(
          "Invalid hero layout. Must be 'two-image' or 'single-image'"
        );
      }
      updateData.heroLayout = images.heroLayout;
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
      categoryLabelDenim: "Denim",
      categoryLabelShoes: "Shoes",
      categoryLabelAccessories: "Accessories",
      categoryLabelSportswear: "Sportswear",
      categoryLabelDresses: "Dresses",
      categoryLabelBrands: "Brands",
      categorySlugDenim: "denim",
      categorySlugShoes: "footwear",
      categorySlugAccessories: "accessories",
      categorySlugSportswear: "sportswear",
      categorySlugDresses: "dresses",
      categorySlugBrands: "brands",
      leagueTitle: "League",
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
        if (!url || url.trim() === "") return false;
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

  /**
   * Get all category sections with their cards
   */
  static async getCategorySections(): Promise<CategorySectionData[]> {
    const sections = await prisma.categorySection.findMany({
      where: { isActive: true },
      include: {
        cards: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    return sections.map((section) => ({
      ...section,
      cards: section.cards,
    }));
  }

  /**
   * Get a single category section by ID
   */
  static async getCategorySection(
    id: string
  ): Promise<CategorySectionData | null> {
    const section = await prisma.categorySection.findUnique({
      where: { id },
      include: {
        cards: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    if (!section) return null;

    return {
      ...section,
      cards: section.cards,
    };
  }

  /**
   * Create a new category section
   */
  static async createCategorySection(data: {
    title: string;
    slug: string;
    description?: string;
    displayOrder?: number;
  }): Promise<CategorySectionData> {
    const section = await prisma.categorySection.create({
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        displayOrder: data.displayOrder || 0,
      },
      include: {
        cards: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    return {
      ...section,
      cards: section.cards,
    };
  }

  /**
   * Update a category section
   */
  static async updateCategorySection(
    id: string,
    data: {
      title?: string;
      slug?: string;
      description?: string;
      displayOrder?: number;
      isActive?: boolean;
    }
  ): Promise<CategorySectionData> {
    const section = await prisma.categorySection.update({
      where: { id },
      data,
      include: {
        cards: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    return {
      ...section,
      cards: section.cards,
    };
  }

  /**
   * Delete a category section
   */
  static async deleteCategorySection(id: string): Promise<void> {
    await prisma.categorySection.delete({
      where: { id },
    });
  }

  /**
   * Create a new category card
   */
  static async createCategoryCard(data: {
    sectionId: string;
    title: string;
    slug: string;
    imageUrl?: string;
    description?: string;
    displayOrder?: number;
  }): Promise<CategoryCardData> {
    const card = await prisma.categoryCard.create({
      data: {
        sectionId: data.sectionId,
        title: data.title,
        slug: data.slug,
        imageUrl: data.imageUrl,
        description: data.description,
        displayOrder: data.displayOrder || 0,
      },
    });

    return card;
  }

  /**
   * Update a category card
   */
  static async updateCategoryCard(
    id: string,
    data: {
      title?: string;
      slug?: string;
      imageUrl?: string;
      description?: string;
      displayOrder?: number;
      isActive?: boolean;
    }
  ): Promise<CategoryCardData> {
    const card = await prisma.categoryCard.update({
      where: { id },
      data,
    });

    return card;
  }

  /**
   * Delete a category card
   */
  static async deleteCategoryCard(id: string): Promise<void> {
    await prisma.categoryCard.delete({
      where: { id },
    });
  }

  /**
   * Initialize default category sections and cards
   */
  static async initializeDefaultCategorySections(): Promise<void> {
    // Check if sections already exist
    const existingSections = await prisma.categorySection.count();
    if (existingSections > 0) return;

    // Create default sections
    const mostPopularSection = await prisma.categorySection.create({
      data: {
        title: "Most Popular",
        slug: "most-popular",
        description:
          "Some types of fashion are worn by so many people, that they become very popular and famous styles, these popular trends are part of the global fashion scene.",
        displayOrder: 0,
      },
    });

    const servicesSection = await prisma.categorySection.create({
      data: {
        title: "Services",
        slug: "services",
        description:
          "Professional services and specialized offerings for our customers.",
        displayOrder: 1,
      },
    });

    const reasonSection = await prisma.categorySection.create({
      data: {
        title: "The Reason",
        slug: "the-reason",
        description:
          "Discover what makes us unique and why customers choose us.",
        displayOrder: 2,
      },
    });

    // Create cards for Most Popular section
    const mostPopularCards = [
      { title: "Denim", slug: "denim", displayOrder: 0 },
      { title: "Shoes", slug: "footwear", displayOrder: 1 },
      { title: "Accessories", slug: "accessories", displayOrder: 2 },
      { title: "Sportswear", slug: "sportswear", displayOrder: 3 },
      { title: "Dresses", slug: "dresses", displayOrder: 4 },
      { title: "Brands", slug: "brands", displayOrder: 5 },
    ];

    for (const card of mostPopularCards) {
      await prisma.categoryCard.create({
        data: {
          sectionId: mostPopularSection.id,
          title: card.title,
          slug: card.slug,
          displayOrder: card.displayOrder,
        },
      });
    }

    // Create cards for Services section
    const servicesCards = [
      { title: "Jerseys", slug: "jerseys", displayOrder: 0 },
      { title: "Athletic", slug: "athletic", displayOrder: 1 },
      { title: "Casual", slug: "casual", displayOrder: 2 },
      { title: "Formal", slug: "formal", displayOrder: 3 },
      { title: "Streetwear", slug: "streetwear", displayOrder: 4 },
      { title: "Vintage", slug: "vintage", displayOrder: 5 },
    ];

    for (const card of servicesCards) {
      await prisma.categoryCard.create({
        data: {
          sectionId: servicesSection.id,
          title: card.title,
          slug: card.slug,
          displayOrder: card.displayOrder,
        },
      });
    }

    // Create cards for The Reason section
    const reasonCards = [
      { title: "Limited Edition", slug: "limited", displayOrder: 0 },
      { title: "Exclusive", slug: "exclusive", displayOrder: 1 },
      { title: "Premium", slug: "premium", displayOrder: 2 },
      { title: "Sustainable", slug: "sustainable", displayOrder: 3 },
      { title: "Artisan", slug: "artisan", displayOrder: 4 },
      { title: "Custom", slug: "custom", displayOrder: 5 },
    ];

    for (const card of reasonCards) {
      await prisma.categoryCard.create({
        data: {
          sectionId: reasonSection.id,
          title: card.title,
          slug: card.slug,
          displayOrder: card.displayOrder,
        },
      });
    }
  }
}

export default CMSService;
