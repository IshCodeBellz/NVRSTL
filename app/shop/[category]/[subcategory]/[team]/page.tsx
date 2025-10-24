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

interface Team {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  products: Product[];
}

export default function TeamPage({
  params,
}: {
  params: { category: string; subcategory: string; team: string };
}) {
  const { toggle, has } = useWishlist();
  const { addItem } = useCart();
  const { push } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const categorySlug = params.category;
  const subcategorySlug = params.subcategory;
  const teamSlug = params.team;

  useEffect(() => {
    async function fetchTeam() {
      try {
        const response = await fetch(
          `/api/shop/${categorySlug}/${subcategorySlug}/${teamSlug}`
        );
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        if (response.ok) {
          const data = await response.json();
          setTeam(data.team);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchTeam();
  }, [categorySlug, subcategorySlug, teamSlug]);

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

  if (notFound || !team) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-10">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-4 text-white font-carbon">
              Team Not Found
            </h1>
            <p className="text-gray-400 mb-6 font-carbon">
              The team you&apos;re looking for doesn&apos;t exist or has no
              products.
            </p>
            <Link
              href={`/shop/${categorySlug}/${subcategorySlug}`}
              className="inline-flex px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors font-bold font-carbon uppercase tracking-wider"
            >
              Back to{" "}
              {subcategorySlug
                .split("-")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")}
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
          <Link
            href={`/shop/${categorySlug}/${subcategorySlug}`}
            className="hover:text-white transition-colors font-carbon"
          >
            {subcategorySlug
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")}
          </Link>
          <span>/</span>
          <span className="text-white font-carbon">{team.name}</span>
        </nav>

        {/* Team Header */}
        <div className="text-center space-y-6 mb-12">
          {/* Team Logo */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-lg flex items-center justify-center overflow-hidden bg-gray-800 border border-gray-700">
            {team.logoUrl ? (
              <Image
                src={team.logoUrl}
                alt={`${team.name} logo`}
                width={96}
                height={96}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-4xl font-bold text-gray-300 font-carbon">
                {team.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white font-carbon">
            {team.name}
          </h1>

          {team.description && (
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto font-carbon">
              {team.description}
            </p>
          )}

          <p className="text-gray-400 font-carbon">
            {team.products.length} product
            {team.products.length !== 1 ? "s" : ""} available
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {team.products.map((product) => (
            <div
              key={product.id}
              className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:shadow-lg hover:shadow-gray-900/20 transition-all duration-200 group"
            >
              {/* Product Image */}
              <div className="aspect-square bg-gray-700 relative overflow-hidden">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-400 font-carbon">No Image</span>
                  </div>
                )}

                {/* Wishlist Button */}
                <button
                  onClick={() =>
                    toggle({
                      productId: product.id,
                      name: product.name,
                      priceCents: product.priceCents,
                      image: product.image || "/placeholder.svg",
                      size: product.sizes?.[0] || "One Size",
                    })
                  }
                  className="absolute top-3 right-3 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                >
                  <span
                    className={`text-lg ${
                      has(
                        lineIdFor(product.id, product.sizes?.[0] || "One Size")
                      )
                        ? "text-red-500"
                        : "text-white"
                    }`}
                  >
                    {has(
                      lineIdFor(product.id, product.sizes?.[0] || "One Size")
                    )
                      ? "♥"
                      : "♡"}
                  </span>
                </button>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-bold text-white mb-2 font-carbon group-hover:text-gray-300 transition-colors">
                  {product.name}
                </h3>

                {product.category && (
                  <p className="text-sm text-gray-400 mb-2 font-carbon">
                    {product.category.name}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <ClientPrice
                    cents={product.priceCents}
                    className="text-lg font-bold text-white font-carbon"
                  />

                  <button
                    onClick={() => {
                      addItem({
                        productId: product.id,
                        name: product.name,
                        priceCents: product.priceCents,
                        image: product.image || "/placeholder.svg",
                        size: product.sizes?.[0] || "One Size",
                      });
                      push({ message: "Added to bag!", type: "success" });
                    }}
                    className="bg-white text-black px-4 py-2 rounded hover:bg-gray-100 transition-colors font-bold font-carbon uppercase tracking-wider text-sm"
                  >
                    Add to Bag
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {team.products.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-xl font-bold mb-4 text-white font-carbon">
              No Products Available
            </h3>
            <p className="text-gray-400 font-carbon">
              Check back soon for new {team.name} products.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
