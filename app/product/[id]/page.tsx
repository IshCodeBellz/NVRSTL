/* eslint-disable */
import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/server/prisma";
import { Suspense } from "react";
import Link from "next/link";
import ProductClient from "./ProductClient";
import { ProductReviews } from "@/components/product/ProductReviews";

import { ClientPrice } from "@/components/ui/ClientPrice";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  // const session = await getServerSession(authOptionsEnhanced);

  const product = (await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      images: { orderBy: { position: "asc" } },
      sizeVariants: true,
      category: { include: { parent: true } },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any; // Temporary type assertion while Prisma client is being regenerated

  if (!product) return notFound();

  // Mock data for reviews - we'll implement the real queries later
  // const averageRating = 4.2;
  // const totalReviews = 156;
  // const canReview = !!session?.user?.id;

  const fromParam =
    typeof searchParams?.from === "string" ? searchParams?.from : undefined;
  const backCategorySlug = fromParam || product.category?.slug;

  function resolveCategoryPath(slug?: string | null): string | null {
    if (!slug) return null;
    const s = slug.toLowerCase();
    // If slug already matches a top-level category we support, return as /slug
    const topLevels = [
      "womens",
      "mens",
      "womens-clothing",
      "mens-clothing",
      "denim",
      "footwear",
      "accessories",
      "sportswear",
      "dresses",
      "outerwear",
      "brands",
    ];
    if (topLevels.includes(s)) return `/${s}`;

    // Support composite slugs like womens-tops, mens-shirts, shoes-trainers, accessories-bags
    const prefixes = ["womens", "mens", "women", "men", "shoes", "accessories"];
    for (const p of prefixes) {
      if (s.startsWith(`${p}-`)) {
        const rest = s.slice(p.length + 1);
        const norm = p === "women" ? "womens" : p === "men" ? "mens" : p;
        return `/${norm}/${rest}`;
      }
    }

    // If category has a parent, stitch as /parent/child
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parentSlug: string | undefined = (product.category?.parent as any)
      ?.slug;
    if (parentSlug) {
      return `/${parentSlug}/${s}`;
    }

    // Fallback: treat as top-level
    return `/${s}`;
  }
  // Pre-shape lightweight client payload
  interface ProductImage {
    id: string;
    url: string;
    alt?: string | null;
  }

  // const structuredData = {
  //   name: product.name,
  //   sku: product.sku,
  //   priceCents: product.priceCents,
  //   image: product.images[0]?.url || "",
  //   description: product.description,
  //   sizes: product.sizeVariants.map((s: SizeVariant) => s.label),
  //   images: product.images.map((i: ProductImage) => i.url),
  // };

  // Shape lightweight product payload for the client component to avoid undefined lengths
  // Normalize jerseyConfig: stringify if Prisma returns JSON object
  const jerseyConfigStr: string | null = (() => {
    const v: any = (product as any).jerseyConfig;
    if (v == null) return null;
    if (typeof v === "string") return v;
    try {
      return JSON.stringify(v);
    } catch {
      return null;
    }
  })();

  const clientProduct = {
    id: product.id as string,
    name: product.name as string,
    priceCents: product.priceCents as number,
    image: (product.images?.[0]?.url as string) || "",
    description: (product.description as string) || "",
    sizes:
      (product.sizeVariants?.map(
        (s: { label: string }) => s.label
      ) as string[]) || [],
    images: (product.images?.map((i: ProductImage) => i.url) as string[]) || [],
    isJersey: Boolean(product.isJersey),
    jerseyConfig: jerseyConfigStr,
  };

  return (
    <div className="container mx-auto px-4 py-10 grid gap-12 lg:grid-cols-2">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description,
            sku: product.sku,
            image: product.images.map((im: ProductImage) => im.url),
            offers: {
              "@type": "Offer",
              priceCurrency: "USD",
              price: (product.priceCents / 100).toFixed(2),
              availability: "https://schema.org/InStock",
              url: `https://example.com/product/${product.id}`,
            },
            category: product.category?.name,
          }),
        }}
      />
      <div className="lg:col-span-2 -mt-4 mb-2">
        {resolveCategoryPath(backCategorySlug) && (
          <Link
            href={resolveCategoryPath(backCategorySlug) || "/"}
            className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 group"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="-ml-0.5"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span>Back to {product.category?.name || backCategorySlug}</span>
          </Link>
        )}
      </div>
      {/* Gallery */}
      <div className="flex gap-4">
        {/* Thumbnails */}
        {product.images.length > 1 && (
          <div
            className="flex flex-col gap-2 w-16 overflow-y-auto max-h-[80vh] pr-1 [-webkit-overflow-scrolling:touch]"
            id="thumbs"
          >
            {product.images.map((im: ProductImage, idx: number) => (
              <a
                key={im.id}
                href={`#image-${idx}`}
                className="block relative aspect-[3/4] rounded overflow-hidden border border-transparent focus:outline-none focus:ring-2 focus:ring-neutral-400 group"
              >
                <Image
                  src={im.url}
                  alt={im.alt || product.name}
                  fill
                  sizes="64px"
                  className="object-cover group-hover:opacity-90"
                />
              </a>
            ))}
          </div>
        )}
        {/* Main carousel */}
        <div className="relative flex-1">
          <div
            className="relative w-full aspect-[3/4] bg-neutral-100 rounded overflow-hidden select-none"
            id="gallery-root"
            tabIndex={0}
            aria-label="Product image gallery"
          >
            {product.images.map((im: ProductImage, idx: number) => (
              <div
                key={im.id}
                id={`image-${idx}`}
                className="absolute inset-0 opacity-0 data-[active='true']:opacity-100 transition-opacity duration-300"
                data-active={idx === 0}
              >
                <Image
                  src={im.url}
                  alt={im.alt || product.name}
                  fill
                  priority={idx === 0}
                  sizes="(max-width:1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            ))}
            {/* Counter overlay */}
            {product.images.length > 1 && (
              <div
                id="gallery-counter"
                className="absolute bottom-2 right-2 text-xs font-semibold bg-black/60 text-white px-2 py-1 rounded"
                aria-live="polite"
              >
                1 / {product.images.length}
              </div>
            )}
            {product.images.length > 1 && (
              <button
                type="button"
                data-gallery-zoom
                className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full w-9 h-9 flex items-center justify-center shadow border"
                aria-label="Open full screen gallery"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 3h6v6" />
                  <path d="M9 21H3v-6" />
                  <path d="M21 3 14 10" />
                  <path d="m3 21 7-7" />
                </svg>
              </button>
            )}
          </div>
          {product.images.length > 1 && (
            <>
              <button
                type="button"
                data-gallery-prev
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-10 h-10 flex items-center justify-center shadow border"
                aria-label="Previous image"
              >
                <span className="sr-only">Previous</span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                data-gallery-next
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-10 h-10 flex items-center justify-center shadow border"
                aria-label="Next image"
              >
                <span className="sr-only">Next</span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
      {/* Zoom / Lightbox Modal */}
      {product.images.length > 0 && (
        <div
          id="gallery-zoom-modal"
          className="fixed inset-0 z-50 hidden bg-black/90 backdrop-blur-sm items-center justify-center"
          aria-modal="true"
          role="dialog"
          aria-label="Full screen product image viewer"
        >
          <button
            type="button"
            data-zoom-close
            className="absolute top-4 right-4 text-white/90 hover:text-white w-10 h-10 flex items-center justify-center"
            aria-label="Close full screen view"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
          <div className="relative w-full max-w-5xl mx-auto px-4">
            <div
              className="relative aspect-[3/4] md:aspect-[5/4]"
              id="zoom-slides"
            >
              {product.images.map((im: ProductImage, idx: number) => (
                <div
                  key={im.id}
                  data-zoom-index={idx}
                  className="absolute inset-0 opacity-0 data-[active='true']:opacity-100 transition-opacity duration-300"
                  data-active={idx === 0}
                >
                  <Image
                    src={im.url}
                    alt={im.alt || product.name}
                    fill
                    sizes="100vw"
                    className="object-contain"
                    priority={idx === 0}
                  />
                </div>
              ))}
              <div
                id="zoom-counter"
                className="absolute bottom-3 right-3 text-xs font-semibold bg-black/60 text-white px-2 py-1 rounded"
                aria-live="polite"
              >
                1 / {product.images.length}
              </div>
              {product.images.length > 1 && (
                <>
                  <button
                    type="button"
                    data-zoom-prev
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full w-12 h-12 flex items-center justify-center backdrop-blur border border-white/20"
                    aria-label="Previous image"
                  >
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    data-zoom-next
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full w-12 h-12 flex items-center justify-center backdrop-blur border border-white/20"
                    aria-label="Next image"
                  >
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Info + actions */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <p className="mt-2 text-2xl font-semibold">
            <ClientPrice
              cents={product.priceCents}
              size="2xl"
              variant="large"
            />
          </p>
        </div>
        <p className="text-sm leading-relaxed text-neutral-700 max-w-prose">
          {product.description}
        </p>
        <Suspense>
          <ProductClient product={clientProduct} />
        </Suspense>
        <div className="text-xs text-neutral-500 space-y-2">
          <p>Free delivery and returns (Ts&Cs apply).</p>
          <p>100 day returns.</p>
        </div>
      </div>

      {/* Product Reviews Section */}
      <div className="lg:col-span-2 mt-16 pt-16 border-t">
        <ProductReviews productId={product.id} />
      </div>
    </div>
  );
}
