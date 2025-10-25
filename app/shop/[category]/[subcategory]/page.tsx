"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { InteractiveProductCard } from "@/components/product/InteractiveProductCard";

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

interface ShopCategory {
  id: string;
  name: string;
  description: string;
  image?: string;
  products: Product[];
  teams?: Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    productCount: number;
  }>;
}

export default function ShopCategoryPage({
  params,
}: {
  params: { category: string; subcategory: string };
}) {
  const [category, setCategory] = useState<ShopCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const categorySlug = params.category;
  const subcategorySlug = params.subcategory;

  useEffect(() => {
    async function fetchCategory() {
      try {
        const response = await fetch(
          `/api/shop/${categorySlug}/${subcategorySlug}`
        );
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        if (response.ok) {
          const data = await response.json();
          setCategory(data.category);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchCategory();
  }, [categorySlug, subcategorySlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-8 h-8 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !category) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-10">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-4 text-white font-carbon">
              Category Not Found
            </h1>
            <p className="text-gray-400 mb-6 font-carbon">
              The category you&apos;re looking for doesn&apos;t exist or has no
              products.
            </p>
            <Link
              href={`/shop/${categorySlug}`}
              className="inline-flex px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors font-bold font-carbon uppercase tracking-wider"
            >
              Back to{" "}
              {categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-400 mb-8">
          <Link
            href="/"
            className="hover:text-white transition-colors font-carbon"
          >
            Home
          </Link>
          <span>/</span>
          <Link
            href="/shop"
            className="hover:text-white transition-colors font-carbon"
          >
            Shop
          </Link>
          <span>/</span>
          <Link
            href={`/shop/${categorySlug}`}
            className="hover:text-white transition-colors font-carbon"
          >
            {categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)}
          </Link>
          <span>/</span>
          <span className="text-white font-carbon">{category.name}</span>
        </nav>

        {/* Category Header */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white font-carbon">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto font-carbon">
              {category.description}
            </p>
          )}
          <p className="text-gray-400 font-carbon">
            {category.products.length} product
            {category.products.length !== 1 ? "s" : ""} available
          </p>
        </div>

        {/* Teams Section */}
        {category.teams && category.teams.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-white font-carbon text-center">
              Teams & Clubs
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {category.teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/shop/${categorySlug}/${subcategorySlug}/${team.slug}`}
                  className="group"
                >
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center hover:shadow-lg hover:shadow-gray-900/20 transition-all duration-200 group-hover:border-gray-500">
                    {/* Team Logo */}
                    <div className="w-12 h-12 mx-auto mb-3 rounded-lg flex items-center justify-center overflow-hidden">
                      {team.logoUrl ? (
                        <Image
                          src={team.logoUrl}
                          alt={`${team.name} logo`}
                          width={48}
                          height={48}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-700 rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
                          <span className="text-lg font-bold text-gray-300 group-hover:text-black font-carbon">
                            {team.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Team Name */}
                    <h3 className="font-bold text-xs mb-1 text-white group-hover:text-gray-300 font-carbon">
                      {team.name}
                    </h3>

                    {/* Product Count */}
                    <p className="text-xs text-gray-400 font-carbon">
                      {team.productCount} product
                      {team.productCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {category.products.map((product) => (
            <InteractiveProductCard
              key={product.id}
              product={{
                id: product.id,
                name: product.name,
                priceCents: product.priceCents,
                image: product.image || "/placeholder.svg",
                category: product.category,
                sizes: product.sizes,
              }}
              variant="square"
              showCategory={true}
            />
          ))}
        </div>

        {category.products.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-xl font-bold mb-4 text-white font-carbon">
              No Products Available
            </h3>
            <p className="text-gray-400 font-carbon">
              Check back soon for new products in this category.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
