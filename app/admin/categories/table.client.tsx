"use client";
import React, { useState } from "react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  displayOrder: number;
  isActive: boolean;
  productCount?: number;
  parent?: Category | null;
  children?: Category[];
}

// Hierarchical sorting function
const sortCategoriesHierarchically = (categories: Category[]): Category[] => {
  return categories.sort((a, b) => {
    // First, separate main categories from subcategories
    const aIsMain = !a.parentId;
    const bIsMain = !b.parentId;

    if (aIsMain && !bIsMain) return -1; // Main categories first
    if (!aIsMain && bIsMain) return 1; // Subcategories after

    // If both are main categories, sort by display order then name
    if (aIsMain && bIsMain) {
      if (a.displayOrder !== b.displayOrder)
        return a.displayOrder - b.displayOrder;
      return a.name.localeCompare(b.name);
    }

    // If both are subcategories, group by parent first
    if (!aIsMain && !bIsMain) {
      if (a.parentId !== b.parentId) {
        // Find parent categories to compare their order
        const parentA = categories.find((c) => c.id === a.parentId);
        const parentB = categories.find((c) => c.id === b.parentId);
        if (parentA && parentB) {
          if (parentA.displayOrder !== parentB.displayOrder) {
            return parentA.displayOrder - parentB.displayOrder;
          }
          return parentA.name.localeCompare(parentB.name);
        }
      }
      // Same parent, sort by display order then name
      if (a.displayOrder !== b.displayOrder)
        return a.displayOrder - b.displayOrder;
      return a.name.localeCompare(b.name);
    }

    return 0;
  });
};

export default function CategoriesClient({ initial }: { initial: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(
    sortCategoriesHierarchically([...initial])
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editParentId, setEditParentId] = useState<string>("");
  const [editDisplayOrder, setEditDisplayOrder] = useState(0);
  const [editIsActive, setEditIsActive] = useState(true);
  const [showSubcategories, setShowSubcategories] = useState<{
    [key: string]: boolean;
  }>({});

  // Helper functions
  const toggleSubcategories = (categoryId: string) => {
    setShowSubcategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const getMainCategories = () => categories.filter((c) => !c.parentId);
  const getSubcategories = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId);

  const getPreviewUrl = () => {
    if (!parentId || !slug) return "";
    const parentCategory = categories.find((c) => c.id === parentId);
    if (!parentCategory) return "";
    return `/${parentCategory.slug}/${slug}`;
  };

  function slugify(v: string) {
    return v
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  async function createCategory() {
    if (!name.trim() || !slug.trim()) return;
    setLoading(true);
    setError(null);

    // Generate the correct database slug format
    let finalSlug = slug;
    if (parentId) {
      const parentCategory = categories.find((c) => c.id === parentId);
      if (parentCategory) {
        finalSlug = `${parentCategory.slug}-${slug}`;
      }
    }

    const res = await fetch("/api/admin/categories", {
      method: "POST",
      body: JSON.stringify({
        name,
        slug: finalSlug,
        description: description || null,
        imageUrl: imageUrl || null,
        parentId: parentId || null,
        displayOrder,
        isActive,
      }),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed");
    } else {
      const data = await res.json();
      setCategories((prev) => {
        const updated = [...prev, data.category];
        return sortCategoriesHierarchically(updated);
      });
      // Reset form
      setName("");
      setSlug("");
      setDescription("");
      setImageUrl("");
      setParentId("");
      setDisplayOrder(0);
      setIsActive(true);
    }
    setLoading(false);
  }

  function startEdit(category: Category) {
    setEditingCategory(category);
    setEditName(category.name);
    setEditSlug(category.slug);
    setEditDescription(category.description || "");
    setEditImageUrl(category.imageUrl || "");
    setEditParentId(category.parentId || "");
    setEditDisplayOrder(category.displayOrder);
    setEditIsActive(category.isActive);
  }

  function cancelEdit() {
    setEditingCategory(null);
    setEditName("");
    setEditSlug("");
    setEditDescription("");
    setEditImageUrl("");
    setEditParentId("");
    setEditDisplayOrder(0);
    setEditIsActive(true);
  }

  async function saveEdit() {
    if (!editingCategory || !editName.trim()) return;

    setLoading(true);
    setError(null);

    // Generate the correct database slug format if parent changed
    let finalSlug = editSlug;
    if (editParentId && editParentId !== editingCategory.parentId) {
      const parentCategory = categories.find((c) => c.id === editParentId);
      if (parentCategory) {
        // Remove old prefix if it exists
        const cleanSlug = editSlug.replace(/^[^-]+-/, "");
        finalSlug = `${parentCategory.slug}-${cleanSlug}`;
      }
    }

    const res = await fetch("/api/admin/categories", {
      method: "PUT",
      body: JSON.stringify({
        id: editingCategory.id,
        name: editName,
        slug: finalSlug,
        description: editDescription || null,
        imageUrl: editImageUrl || null,
        parentId: editParentId || null,
        displayOrder: editDisplayOrder,
        isActive: editIsActive,
      }),
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to update category");
    } else {
      const data = await res.json();
      setCategories((prev) => {
        const updated = prev.map((c) =>
          c.id === editingCategory.id ? data.category : c
        );
        return sortCategoriesHierarchically(updated);
      });
      cancelEdit();
    }
    setLoading(false);
  }

  async function remove(id: string) {
    if (!confirm("Delete category? (must have no products)")) return;
    const res = await fetch(`/api/admin/categories?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) setCategories((prev) => prev.filter((c) => c.id !== id));
    else alert("Delete failed (in use or not found)");
  }

  return (
    <div className="space-y-6">
      {/* Add New Category Section */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Add New Category
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Name *
            </label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) setSlug(slugify(e.target.value));
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter category name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL Slug *
            </label>
            <input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="auto-generated-slug"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parent Category
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No Parent (Main Category)</option>
              {categories
                .filter((c) => !c.parentId)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Category description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Order
            </label>
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image URL
            </label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/image.jpg"
            />
          </div>
          {getPreviewUrl() && (
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview URL
              </label>
              <div className="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm font-mono text-gray-600">
                {getPreviewUrl()}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="isActive"
              className="text-sm font-medium text-gray-700"
            >
              Active
            </label>
          </div>
        </div>
        <div className="mt-4 flex gap-3 items-center">
          <button
            disabled={loading || !name.trim() || !slug.trim()}
            onClick={createCategory}
            className="px-6 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Adding..." : "Add Category"}
          </button>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Edit Category: {editingCategory.name}
            </h3>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    if (
                      !editSlug.includes("-") ||
                      editSlug === editingCategory.slug
                    ) {
                      setEditSlug(slugify(e.target.value));
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter category name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL Slug *
                </label>
                <input
                  value={editSlug}
                  onChange={(e) => setEditSlug(slugify(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="auto-generated-slug"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Category
                </label>
                <select
                  value={editParentId}
                  onChange={(e) => setEditParentId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No Parent (Main Category)</option>
                  {categories
                    .filter((c) => !c.parentId && c.id !== editingCategory.id)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Category description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  value={editDisplayOrder}
                  onChange={(e) =>
                    setEditDisplayOrder(parseInt(e.target.value) || 0)
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image URL
                </label>
                <input
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="editIsActive"
                  className="text-sm font-medium text-gray-700"
                >
                  Active
                </label>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={cancelEdit}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={loading || !editName.trim()}
                className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>

            {error && (
              <div className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Categories Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
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
              {getMainCategories().map((category) => (
                <React.Fragment key={category.id}>
                  {/* Main Category Row */}
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getSubcategories(category.id).length > 0 && (
                          <button
                            onClick={() => toggleSubcategories(category.id)}
                            className="mr-2 text-gray-400 hover:text-gray-600"
                          >
                            {showSubcategories[category.id] ? "▼" : "▶"}
                          </button>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {category.name}
                          </div>
                          {category.imageUrl && (
                            <div className="text-xs text-blue-600 mt-1">
                              Has image
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs truncate">
                        {category.description || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
                        {category.slug}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {category.displayOrder}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {category.productCount || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          category.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {category.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => startEdit(category)}
                          className="text-blue-600 hover:text-blue-900 font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(category.id)}
                          className="text-red-600 hover:text-red-900 font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Subcategories */}
                  {showSubcategories[category.id] &&
                    getSubcategories(category.id).map((subcategory) => (
                      <tr
                        key={subcategory.id}
                        className="bg-gray-25 hover:bg-gray-100 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center pl-8">
                            <div>
                              <div className="text-sm font-medium text-gray-700">
                                ↳ {subcategory.name}
                              </div>
                              {subcategory.imageUrl && (
                                <div className="text-xs text-blue-600 mt-1">
                                  Has image
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 max-w-xs truncate">
                            {subcategory.description || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
                              {subcategory.slug}
                            </div>
                            <div className="text-xs text-blue-600 font-mono">
                              URL: /{subcategory.parent?.slug || category.slug}/
                              {subcategory.slug.replace(
                                `${category.slug}-`,
                                ""
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700">
                            {subcategory.displayOrder}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700">
                            {subcategory.productCount || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              subcategory.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {subcategory.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => startEdit(subcategory)}
                              className="text-blue-600 hover:text-blue-900 font-medium transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => remove(subcategory.id)}
                              className="text-red-600 hover:text-red-900 font-medium transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <div className="text-lg font-medium mb-2">
                        No categories found
                      </div>
                      <div className="text-sm">
                        Get started by adding your first category above.
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
