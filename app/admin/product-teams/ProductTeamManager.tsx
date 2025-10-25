"use client";

import { useState, useEffect, useCallback } from "react";
import { Link as LinkIcon } from "lucide-react";

interface Team {
  id: string;
  name: string;
  subcategory: {
    name: string;
    category: {
      name: string;
    };
  };
  products: Array<{
    id: string;
    name: string;
  }>;
}

interface UnlinkedProduct {
  id: string;
  name: string;
  brand: {
    name: string;
  } | null;
}

export function ProductTeamManager() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [unlinkedProducts, setUnlinkedProducts] = useState<UnlinkedProduct[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [linking, setLinking] = useState<string | null>(null);

  const showMessage = useCallback((text: string, type: "success" | "error") => {
    setMessage({ text, type });
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/link-product-team", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
        setUnlinkedProducts(data.unlinkedProducts || []);
      } else {
        const errorData = await response.json();
        showMessage(errorData.error || "Failed to load data", "error");
      }
    } catch {
      showMessage("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const linkProductToTeam = async (productId: string, teamId: string) => {
    try {
      setLinking(productId);
      const response = await fetch("/api/admin/link-product-team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ productId, teamId }),
      });

      if (response.ok) {
        const data = await response.json();
        showMessage(data.message, "success");
        loadData(); // Reload data
      } else {
        const error = await response.json();
        showMessage(error.error, "error");
      }
    } catch {
      showMessage("Failed to link product", "error");
    } finally {
      setLinking(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message Display */}
      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Teams with Products */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Teams with Products (
            {teams.filter((t) => t.products.length > 0).length})
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Teams that have products linked to them
          </p>
        </div>
        <div className="p-6">
          {teams.filter((t) => t.products.length > 0).length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No teams have products yet
            </p>
          ) : (
            <div className="space-y-4">
              {teams
                .filter((t) => t.products.length > 0)
                .map((team) => (
                  <div
                    key={team.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {team.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {team.subcategory.category.name} →{" "}
                          {team.subcategory.name}
                        </p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {team.products.length} product
                        {team.products.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {team.products.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between bg-gray-50 rounded px-3 py-2"
                        >
                          <span className="text-sm text-gray-700">
                            {product.name}
                          </span>
                          <a
                            href={`/admin/products/${product.id}`}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Edit Product
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Unlinked Products */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Unlinked Products ({unlinkedProducts.length})
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Products that are not linked to any team
          </p>
        </div>
        <div className="p-6">
          {unlinkedProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              All products are linked to teams
            </p>
          ) : (
            <div className="space-y-4">
              {unlinkedProducts.map((product) => (
                <div
                  key={product.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {product.brand?.name || "No brand"}
                      </p>
                    </div>
                    <a
                      href={`/admin/products/${product.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Edit Product
                    </a>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Link to Team:
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {teams.map((team) => (
                        <button
                          key={team.id}
                          onClick={() => linkProductToTeam(product.id, team.id)}
                          disabled={linking === product.id}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {linking === product.id ? (
                            <div className="w-3 h-3 border border-blue-700 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <LinkIcon className="w-3 h-3" />
                          )}
                          {team.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
