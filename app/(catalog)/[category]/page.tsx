"use client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { CategoryProductCard } from "@/components/product/CategoryProductCard";
import Image from "next/image";

interface ProductResponse {
  id: string;
  name: string;
  priceCents: number;
  price?: number;
  images: Array<{ url: string; alt?: string }>;
  brand?: { name: string };
  sizes?: Array<{ label: string; stock: number }>;
}

interface ProductsAPIResponse {
  items: ProductResponse[];
  total: number;
  page: number;
  totalPages: number;
}

const validCategories = [
  "womens-clothing",
  "mens-clothing",
  "womens",
  "mens",
  "denim",
  "footwear",
  "accessories",
  "sportswear",
  "dresses",
  "outerwear",
  "brands",
];

export default function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  // Initialize all state hooks first
  const category = params.category.toLowerCase();
  const [items, setItems] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const viewedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Validate category after hooks are initialized
    if (!validCategories.includes(category)) {
      notFound();
      return;
    }

    async function fetchProducts() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/products?category=${category}&page=${page}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: ProductsAPIResponse = await response.json();
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [category, page]);

  const isFaceBody = category === "face-body";

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-10">
      {isFaceBody && (
        <section className="relative h-64 md:h-80 w-full overflow-hidden rounded-lg">
          <Image
            src="https://picsum.photos/seed/facebody-hero/1600/900"
            alt="Face and body care assortment"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="relative z-10 h-full flex flex-col justify-end p-6 md:p-10 text-white">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Face & Body Care
            </h1>
            <p className="text-lg md:text-xl mt-2 opacity-90">
              Discover our curated selection of premium skincare and body care
              products
            </p>
          </div>
        </section>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 capitalize">
              {category.replace("-", " ")}
            </h1>
            <p className="text-gray-600 mt-2">
              {total} {total === 1 ? "product" : "products"} found
            </p>
          </div>
          {total > 0 && (
            <button
              onClick={() => {
                // Clear filters logic would go here
                console.log("Clear filters");
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-500 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No products found
            </h3>
            <p className="text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((p) => (
              <CategoryProductCard
                key={p.id}
                product={p}
                viewedRef={viewedRef}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
