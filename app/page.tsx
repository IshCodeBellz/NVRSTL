import Image from "next/image";
import Link from "next/link";
import { RecentlyViewed } from "../components/home/RecentlyViewed";
import { TrendingNow } from "../components/home/TrendingNow";
import { ReviewsCarousel } from "../components/home/ReviewsCarousel";
import { CMSService } from "@/lib/server/cmsService";

export default async function HomePage() {
  // Get CMS images
  const { heroImages, categoryImages } = await CMSService.getHomePageImages();

  return (
    <div className="space-y-12 pb-20">
      <section className="relative h-[480px] w-full bg-neutral-200 flex items-center justify-center">
        <div className="absolute inset-0 grid md:grid-cols-2">
          <div className="hidden md:block relative">
            <Image
              src={heroImages.left}
              alt="Hero"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative">
            <Image
              src={heroImages.right}
              alt="Hero"
              fill
              className="object-cover"
            />
          </div>
        </div>
        <div className="relative z-10 text-center bg-white/80 backdrop-blur rounded p-8 mx-4 max-w-xl">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-black">
            Discover Fashion Online
          </h1>
          <p className="mt-4 text-sm md:text-base text-neutral-700">
            Shop the latest trends in clothing, shoes, accessories and more from
            over 850 brands.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/womens" className="btn-primary">
              Shop Women
            </Link>
            <Link href="/mens" className="btn-outline">
              Shop Men
            </Link>
          </div>
        </div>
      </section>

      {/* Recently Viewed (client only, appears when user has viewed >=3 products) */}
      <RecentlyViewed />

      {/* Data-driven Trending Now */}
      <TrendingNow />

      <section className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6">Shop By Category</h2>
        {/* Enhanced category grid: show primary categories as image cards & a wide New In banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 auto-rows-[140px] md:auto-rows-[160px]">
          {[
            {
              label: "Denim",
              slug: "denim",
              img: categoryImages.denim,
            },
            {
              label: "Shoes",
              slug: "footwear",
              img: categoryImages.shoes,
            },
            {
              label: "Accessories",
              slug: "accessories",
              img: categoryImages.accessories,
            },
            {
              label: "Sportswear",
              slug: "sportswear",
              img: categoryImages.sportswear,
            },
            {
              label: "Dresses",
              slug: "dresses",
              img: categoryImages.dresses,
            },
            {
              label: "Brands",
              slug: "brands",
              img: categoryImages.brands,
            },
          ].map((cat) => (
            <Link
              key={cat.slug}
              href={`/${cat.slug}`}
              className="group relative rounded-xl overflow-hidden ring-1 ring-neutral-200 bg-neutral-100 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black/50 transition-all"
              aria-label={`Shop ${cat.label}`}
            >
              <Image
                src={cat.img}
                alt={cat.label}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black/60" />
              <div className="absolute bottom-2 left-2 right-2">
                <span className="inline-block rounded bg-white/90 px-2 py-1 text-xs font-semibold tracking-wide text-neutral-900 backdrop-blur-sm shadow-sm group-hover:bg-white">
                  {cat.label}
                </span>
              </div>
            </Link>
          ))}

          {/* New In banner spanning all columns */}
          <Link
            href="/new-in"
            className="relative col-span-2 sm:col-span-3 md:col-span-6 h-[140px] md:h-[180px] overflow-hidden rounded-xl group flex items-center justify-center ring-2 ring-rose-200 bg-gradient-to-r from-rose-600 via-rose-500 to-orange-400 text-white shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-rose-400/50 transition-all"
            aria-label="Shop New In arrivals"
          >
            <div
              className="absolute inset-0 opacity-40 mix-blend-overlay bg-cover bg-center"
              style={{ backgroundImage: `url('${categoryImages.newIn}')` }}
            />
            <div className="relative z-10 text-center px-6">
              <span className="block text-xs tracking-[0.2em] font-bold mb-1">
                JUST DROPPED
              </span>
              <span className="block text-2xl md:text-3xl font-black tracking-tight">
                New In
              </span>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold bg-white/15 px-2 py-1 rounded-full backdrop-blur-sm border border-white/30 group-hover:bg-white/25 transition">
                <span className="inline-block h-2 w-2 rounded-full bg-lime-300 animate-pulse" />{" "}
                Fresh Styles Added
              </span>
            </div>
            <span className="absolute top-2 right-2 bg-white text-rose-600 text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide shadow">
              NEW
            </span>
          </Link>
        </div>
      </section>

      {/* Customer Reviews Carousel */}
      <ReviewsCarousel />
    </div>
  );
}
