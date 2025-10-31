"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useWishlist, useCart } from "@/components/providers/CartProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { ClientPrice } from "@/components/ui/ClientPrice";
import { lineIdFor } from "@/lib/types";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  priceCents: number;
  image?: string;
  sizes?: string[];
  category?: {
    name: string;
    slug: string;
  };
}

interface Brand {
  id: string;
  name: string;
  products: Product[];
}

export default function BrandPage({ params }: { params: { brand: string } }) {
  const { toggle, has } = useWishlist();
  const { addItem } = useCart();
  const { push } = useToast();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const brandSlug = params.brand;

  useEffect(() => {
    async function fetchBrand() {
      try {
        const response = await fetch(`/api/brands/${brandSlug}`);
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        if (response.ok) {
          const data = await response.json();
          setBrand(data.brand);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchBrand();
  }, [brandSlug]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (notFound || !brand) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-4">Brand Not Found</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            The brand you&apos;re looking for doesn&apos;t exist or has no
            products.
          </p>
          <Link
            href="/brands"
            className="inline-flex px-6 py-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            Browse All Brands
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-neutral-600 dark:text-neutral-400">
        <Link
          href="/"
          className="hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          Home
        </Link>
        <span>/</span>
        <Link
          href="/brands"
          className="hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          Brands
        </Link>
        <span>/</span>
        <span className="text-neutral-900 dark:text-neutral-100">
          {brand.name}
        </span>
      </nav>

      {/* Brand Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">{brand.name}</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          {brand.products.length} product
          {brand.products.length !== 1 ? "s" : ""} available
        </p>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {brand.products.map((product) => {
          const id = lineIdFor(product.id);
          const inWish = has(id);
          const hasSizes =
            Array.isArray(product.sizes) && product.sizes.length > 0;

          return (
            <div
              key={product.id}
              className="group relative bg-neutral-100 aspect-[3/4] overflow-hidden rounded flex flex-col"
            >
              <Link
                href={`/product/${product.id}`}
                className="absolute inset-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <Image
                  src={product.image || "/placeholder.svg"}
                  width={400}
                  height={500}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                  alt={product.name}
                />
              </Link>

              {/* Actions */}
              <div className="absolute top-2 right-2 flex flex-col gap-2">
                <button
                  onClick={() => {
                    const already = inWish;
                    toggle({
                      productId: product.id,
                      name: product.name,
                      priceCents: product.priceCents,
                      image: product.image || "/placeholder.svg",
                    });
                    push({
                      type: already ? "info" : "success",
                      message: already ? "Removed from saved" : "Saved",
                    });
                  }}
                  className={`rounded-full h-8 w-8 text-[11px] font-semibold flex items-center justify-center backdrop-blur bg-white/80 border ${
                    inWish ? "border-neutral-900" : "border-transparent"
                  }`}
                >
                  {inWish ? "♥" : "♡"}
                </button>

                <div className="relative">
                  <button
                    onClick={(e) => {
                      if (hasSizes) {
                        const host = (e.currentTarget
                          .parentElement as HTMLElement)!.querySelector<HTMLElement>(
                          "[data-size-popover]"
                        );
                        if (host) host.toggleAttribute("data-open");
                        return;
                      }
                      addItem(
                        {
                          productId: product.id,
                          name: product.name,
                          priceCents: product.priceCents,
                          image: product.image || "/placeholder.svg",
                        },
                        1
                      );
                      push({ type: "success", message: "Added to bag" });
                    }}
                    className="rounded-full h-8 w-8 text-[15px] leading-none font-semibold flex items-center justify-center backdrop-blur bg-white/80 border border-transparent"
                    aria-label={hasSizes ? "Choose size" : "Add to bag"}
                  >
                    +
                  </button>

                  {hasSizes && (
                    <div
                      data-size-popover
                      className="absolute top-9 right-0 z-30 hidden data-[open]:flex flex-col gap-2 bg-neutral-900/95 shadow-xl border border-neutral-700 rounded-md p-3 min-w-[140px]"
                    >
                      <div className="text-[10px] font-carbon font-bold uppercase tracking-widest text-white/70 pb-2 border-b border-white/10">
                        Select size
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {product.sizes?.map((size: string) => (
                          <button
                            key={size}
                            onClick={() => {
                              addItem(
                                {
                                  productId: product.id,
                                  name: product.name,
                                  priceCents: product.priceCents,
                                  image: product.image || "/placeholder.svg",
                                  size: size,
                                },
                                1
                              );
                              push({
                                type: "success",
                                message: `Added ${size}`,
                              });
                              const host = document.querySelector(
                                `[data-size-popover][data-open]`
                              ) as HTMLElement;
                              host?.removeAttribute("data-open");
                            }}
                            className="px-2.5 py-1.5 text-[11px] rounded border border-white/20 text-white/90 hover:bg-white/10 active:bg-white/15"
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          const host = document.querySelector(
                            `[data-size-popover][data-open]`
                          ) as HTMLElement;
                          host?.removeAttribute("data-open");
                        }}
                        className="mt-1.5 text-[11px] text-white/60 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs">
                <div className="font-semibold truncate" title={product.name}>
                  {product.name}
                </div>
                <div className="text-white">
                  <ClientPrice
                    cents={product.priceCents}
                    size="sm"
                    className="text-white"
                  />
                </div>
                {product.category && (
                  <div className="text-white/80 text-[10px]">
                    {product.category.name}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {brand.products.length === 0 && (
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-4">No Products Available</h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            This brand doesn&apos;t have any products available right now.
          </p>
          <Link
            href="/brands"
            className="inline-flex px-6 py-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            Browse Other Brands
          </Link>
        </div>
      )}
    </div>
  );
}
