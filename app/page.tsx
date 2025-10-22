import Image from "next/image";
import Link from "next/link";
import { RecentlyViewed } from "../components/home/RecentlyViewed";
import { TrendingNow } from "../components/home/TrendingNow";
import { ReviewsCarousel } from "../components/home/ReviewsCarousel";
import { DynamicCategories } from "../components/home/DynamicCategories";
import { ScrollingBanner } from "../components/home/ScrollingBanner";
import { CMSService, CategorySectionData } from "@/lib/server/cmsService";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Get CMS images and category sections with error handling
  let heroImages: { left: string; right: string };
  let heroLayout: "two-image" | "single-image";
  let categoryImages: Record<string, string>;
  let categorySections: CategorySectionData[];

  try {
    const [homePageData, categoryData] = await Promise.all([
      CMSService.getHomePageImages(),
      CMSService.getCategorySections(),
    ]);

    heroImages = homePageData.heroImages;
    heroLayout = homePageData.heroLayout;
    categoryImages = homePageData.categoryImages;
    categorySections = categoryData;
  } catch (error) {
    console.error("Error loading CMS data:", error);
    // Fallback data
    heroImages = {
      left: "https://picsum.photos/900/1200",
      right: "https://picsum.photos/901/1200",
    };
    heroLayout = "two-image";
    categoryImages = {
      denim: "https://picsum.photos/400/300",
      tops: "https://picsum.photos/401/300",
      shoes: "https://picsum.photos/402/300",
      accessories: "https://picsum.photos/403/300",
    };
    categorySections = [];
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative h-screen w-full bg-gray-900 flex items-center justify-center">
        {heroLayout === "single-image" ? (
          <div className="absolute inset-0">
            <Image
              src={heroImages.left}
              alt="Hero"
              fill
              className="object-cover opacity-60"
            />
          </div>
        ) : (
          <div className="absolute inset-0 grid md:grid-cols-2">
            <div className="hidden md:block relative">
              <Image
                src={heroImages.left}
                alt="Hero"
                fill
                className="object-cover opacity-60"
              />
            </div>
            <div className="relative">
              <Image
                src={heroImages.right}
                alt="Hero"
                fill
                className="object-cover opacity-60"
              />
            </div>
          </div>
        )}
        <div className="relative z-10 text-center px-8 max-w-6xl">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white font-carbon uppercase leading-tight">
            REP YOUR GRIND. OWN YOUR STYLE.
          </h1>
          <p className="mt-8 text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
            Global sportswear built for performance and style - made for
            everyday hustle. Rep your grind. Own your style.
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-6">
            <Link
              href="/womens"
              className="bg-white text-black px-8 py-4 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors font-carbon"
            >
              Shop Women
            </Link>
            <Link
              href="/mens"
              className="border-2 border-white text-white px-8 py-4 font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors font-carbon"
            >
              Shop Men
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="w-12 h-12 rounded-full bg-gray-800/50 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-gray-700/50 transition-colors cursor-pointer">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Feature/Benefit Section */}
      <ScrollingBanner />

      {/* Recently Viewed (client only, appears when user has viewed >=3 products) */}
      <RecentlyViewed />

      {/* Data-driven Trending Now */}
      <TrendingNow />

      {/* Dynamic Categories Section */}
      <section className="bg-black py-20">
        <div className="container mx-auto px-8">
          <DynamicCategories
            sections={categorySections}
            categoryImages={categoryImages}
          />
        </div>
      </section>

      {/* Customer Reviews Carousel */}
      <ReviewsCarousel />
    </div>
  );
}
