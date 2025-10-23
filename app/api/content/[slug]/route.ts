import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { withRequest } from "@/lib/server/logger";
import { CMSService } from "@/lib/server/cmsService";

export const dynamic = "force-dynamic";

// Get public content for a specific page
export const GET = withRequest(async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // Try to get content from CMS service first
    try {
      const content = await CMSService.getLandingPageContent();
      if (content && slug === "home") {
        return NextResponse.json({ content });
      }
    } catch {
      logger.warn("CMS service not available, falling back to mock data");
    }

    // Mock content for different pages
    const mockContent: Record<string, Record<string, unknown>> = {
      home: {
        id: "clp_landing_01",
        slug: "home",
        title: "Landing Page",
        type: "landing",
        sections: [
          {
            id: "cls_hero_01",
            type: "hero",
            title: "Welcome to DY Official",
            subtitle: "Discover the latest fashion trends",
            content: {
              description:
                "Premium quality clothing and accessories for the modern lifestyle.",
              ctaText: "Shop Now",
              ctaLink: "/drops",
              backgroundImage: "/hero-bg.jpg",
            },
            order: 1,
            isVisible: true,
          },
          {
            id: "cls_features_01",
            type: "features",
            title: "Why Choose Us",
            subtitle: "Quality you can trust",
            content: {
              features: [
                {
                  title: "Premium Quality",
                  description: "Carefully selected materials and craftsmanship",
                  icon: "shield-check",
                },
                {
                  title: "Fast Shipping",
                  description: "Free delivery on orders over £50",
                  icon: "truck",
                },
                {
                  title: "Easy Returns",
                  description: "30-day hassle-free return policy",
                  icon: "refresh-ccw",
                },
              ],
            },
            order: 2,
            isVisible: true,
          },
          {
            id: "cls_reviews_01",
            type: "reviews",
            title: "Customer Reviews",
            subtitle: "What our customers say",
            content: {
              displayCount: 6,
              showRatings: true,
              autoPlay: true,
              platforms: ["trustpilot", "google"],
            },
            order: 3,
            isVisible: true,
          },
        ],
        settings: {
          siteName: "DY Official",
          primaryColor: "#000000",
          secondaryColor: "#ffffff",
          logoUrl: "/logo.png",
        },
      },
    };

    const content = mockContent[slug];

    if (!content) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ content });
  } catch (error) {
    logger.error("Error fetching page content:", error);
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 }
    );
  }
});
