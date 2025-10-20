"use client";
import { useState } from "react";
import Image from "next/image";

interface Brand {
  id: string;
  name: string;
  logoUrl?: string | null;
  backgroundImage?: string | null;
  description?: string | null;
  isFeatured: boolean;
  displayOrder: number;
  productCount?: number;
}

export default function BrandsClient({ initial }: { initial: Brand[] }) {
  const [brands, setBrands] = useState<Brand[]>(initial);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    logoUrl: "",
    backgroundImage: "",
    description: "",
    isFeatured: false,
    displayOrder: 0,
  });

  async function createBrand() {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/brands", {
      method: "POST",
      body: JSON.stringify({ name }),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed");
    } else {
      const data = await res.json();
      setBrands((prev) =>
        [
          ...prev,
          {
            ...data.brand,
            productCount: 0,
            isFeatured: false,
            displayOrder: 0,
          },
        ].sort((a, b) => {
          if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1;
          if (a.displayOrder !== b.displayOrder)
            return a.displayOrder - b.displayOrder;
          return a.name.localeCompare(b.name);
        })
      );
      setName("");
    }
    setLoading(false);
  }

  function startEdit(brand: Brand) {
    setEditingBrand(brand);
    setEditForm({
      name: brand.name,
      logoUrl: brand.logoUrl || "",
      backgroundImage: brand.backgroundImage || "",
      description: brand.description || "",
      isFeatured: brand.isFeatured,
      displayOrder: brand.displayOrder,
    });
  }

  function cancelEdit() {
    setEditingBrand(null);
    setEditForm({
      name: "",
      logoUrl: "",
      backgroundImage: "",
      description: "",
      isFeatured: false,
      displayOrder: 0,
    });
  }

  async function saveEdit() {
    if (!editingBrand) return;
    setLoading(true);
    const res = await fetch("/api/admin/brands", {
      method: "PUT",
      body: JSON.stringify({
        id: editingBrand.id,
        ...editForm,
        logoUrl: editForm.logoUrl || null,
        backgroundImage: editForm.backgroundImage || null,
        description: editForm.description || null,
      }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      setBrands((prev) =>
        prev
          .map((b) =>
            b.id === editingBrand.id
              ? { ...data.brand, productCount: b.productCount }
              : b
          )
          .sort((a, b) => {
            if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1;
            if (a.displayOrder !== b.displayOrder)
              return a.displayOrder - b.displayOrder;
            return a.name.localeCompare(b.name);
          })
      );
      cancelEdit();
    } else {
      alert("Update failed");
    }
    setLoading(false);
  }

  async function remove(id: string) {
    if (!confirm("Delete brand? (must have no products)")) return;
    const res = await fetch(`/api/admin/brands?id=${id}`, { method: "DELETE" });
    if (res.ok) setBrands((prev) => prev.filter((b) => b.id !== id));
    else alert("Delete failed (in use or not found)");
  }

  return (
    <div className="space-y-6">
      {/* Add New Brand Section */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Add New Brand
        </h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label
              htmlFor="brand-name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Brand Name
            </label>
            <input
              id="brand-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter brand name"
              aria-describedby={error ? "brand-error" : undefined}
              onKeyPress={(e) => e.key === "Enter" && createBrand()}
            />
          </div>
          <button
            disabled={loading || !name.trim()}
            onClick={createBrand}
            className="px-6 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Adding..." : "Add Brand"}
          </button>
        </div>
        {error && (
          <div
            id="brand-error"
            className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-md"
            role="alert"
          >
            {error}
          </div>
        )}
      </div>

      {/* Edit Brand Modal */}
      {editingBrand && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-brand-title"
        >
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3
                id="edit-brand-title"
                className="text-lg font-medium text-gray-900"
              >
                Edit Brand: {editingBrand.name}
              </h3>
              <button
                onClick={() => setEditingBrand(null)}
                aria-label="Close dialog"
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label
                  htmlFor="edit-brand-name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Brand Name
                </label>
                <input
                  id="edit-brand-name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter brand name"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-logo-url"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Logo URL
                </label>
                <input
                  id="edit-logo-url"
                  type="url"
                  value={editForm.logoUrl}
                  onChange={(e) =>
                    setEditForm({ ...editForm, logoUrl: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/logo.png"
                />
                {editForm.logoUrl && (
                  <div className="mt-2">
                    <Image
                      src={editForm.logoUrl}
                      alt="Logo preview"
                      width={80}
                      height={80}
                      className="w-20 h-20 object-contain border border-gray-200 rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Image URL (for featured brands)
                </label>
                <input
                  value={editForm.backgroundImage}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      backgroundImage: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/background.jpg"
                />
                {editForm.backgroundImage && (
                  <div className="mt-2">
                    <Image
                      src={editForm.backgroundImage}
                      alt="Background preview"
                      width={128}
                      height={80}
                      className="w-32 h-20 object-cover border border-gray-200 rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brand description (optional)"
                />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center">
                  <input
                    id="featured"
                    type="checkbox"
                    checked={editForm.isFeatured}
                    onChange={(e) =>
                      setEditForm({ ...editForm, isFeatured: e.target.checked })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="featured"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Featured Brand
                  </label>
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={editForm.displayOrder}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        displayOrder: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-20 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Lower numbers appear first
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brands Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Images
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {brands.map((brand) => (
                <tr
                  key={brand.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    brand.isFeatured
                      ? "bg-blue-50 border-l-4 border-blue-500"
                      : ""
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10">
                        {brand.logoUrl ? (
                          <Image
                            src={brand.logoUrl}
                            alt={`${brand.name} logo`}
                            width={40}
                            height={40}
                            className="w-10 h-10 object-contain border border-gray-200 rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-sm font-medium text-gray-600">
                            {brand.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {brand.name}
                          {brand.isFeatured && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              ⭐ Featured
                            </span>
                          )}
                        </div>
                        {brand.description && (
                          <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                            {brand.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          brand.logoUrl ? "bg-green-400" : "bg-gray-300"
                        }`}
                        title={brand.logoUrl ? "Logo set" : "No logo"}
                      />
                      <div
                        className={`w-3 h-3 rounded-full ${
                          brand.backgroundImage ? "bg-green-400" : "bg-gray-300"
                        }`}
                        title={
                          brand.backgroundImage
                            ? "Background set"
                            : "No background"
                        }
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {brand.productCount || 0}{" "}
                      {brand.productCount === 1 ? "product" : "products"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        (brand.productCount || 0) > 0
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {(brand.productCount || 0) > 0 ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => startEdit(brand)}
                        className="text-blue-600 hover:text-blue-900 font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(brand.id)}
                        className="text-red-600 hover:text-red-900 font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {brands.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <div className="text-lg font-medium mb-2">
                        No brands found
                      </div>
                      <div className="text-sm">
                        Get started by adding your first brand above.
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
