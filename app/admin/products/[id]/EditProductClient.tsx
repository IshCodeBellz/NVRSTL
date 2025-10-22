/* eslint-disable */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BASE_CURRENCY } from "@/lib/currency";
import { useRouter } from "next/navigation";
import JerseyOptionsEditor from "@/components/admin/JerseyOptionsEditor";

interface ImageInput {
  id?: string;
  url: string;
  alt: string | null;
  position: number;
  createdAt?: Date;
  updatedAt?: Date;
  imageType?: string;
  variantId?: string | null;
  productId?: string;
}
interface SizeInput {
  id?: string;
  label: string;
  stock: number;
}
interface MetaBrand {
  id: string;
  name: string;
}
interface MetaCategory {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  priceCents: number;
  brandId: string | null;
  categoryId: string | null;
  gender?: string | null;
  images: ImageInput[];
  sizeVariants: SizeInput[];
  deletedAt?: Date | null;
  isJersey?: boolean;
  jerseyConfig?: string | null;
}

export function EditProductClient({ product }: { product: Product }) {
  const router = useRouter();
  const [sku, setSku] = useState(product.sku || "");
  const [name, setName] = useState(product.name || "");
  const [description, setDescription] = useState(product.description || "");
  const [price, setPrice] = useState((product.priceCents / 100).toFixed(2));
  const [brandId, setBrandId] = useState<string | "">(product.brandId || "");
  const [categoryId, setCategoryId] = useState<string | "">(
    product.categoryId || ""
  );
  const [productType, setProductType] = useState<string>(
    (product as any).productType || ""
  );
  const [gender, setGender] = useState<string>((product as any).gender || "");
  const [images, setImages] = useState<ImageInput[]>(
    [...product.images].sort((a, b) => a.position - b.position)
  );
  const [sizes, setSizes] = useState<SizeInput[]>(product.sizeVariants || []);
  const [metaBrands, setMetaBrands] = useState<MetaBrand[]>([]);
  const [metaCategories, setMetaCategories] = useState<MetaCategory[]>([]);
  const [saving, setSaving] = useState(false);
  // Normalize jerseyConfig: some environments return Json object instead of string
  const [jerseyConfig, setJerseyConfig] = useState<string>(() => {
    const v: any = (product as any).jerseyConfig;
    if (v == null) return "";
    if (typeof v === "string") return v;
    try {
      return JSON.stringify(v);
    } catch {
      return "";
    }
  });
  // Infer isJersey from either the boolean or presence of jerseyConfig (in case the boolean wasn't persisted)
  const [isJersey, setIsJersey] = useState<boolean>(
    !!(product as any).isJersey || !!(product as any).jerseyConfig
  );
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [skuAvailable, setSkuAvailable] = useState<boolean | null>(null);
  const [checkingSku, setCheckingSku] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [deleted, setDeleted] = useState<boolean>(!!product.deletedAt);

  useEffect(() => {
    fetch("/api/admin/meta")
      .then((r) => r.json())
      .then((d) => {
        if (d.brands) setMetaBrands(d.brands);
        if (d.categories) setMetaCategories(d.categories);
      });
  }, []);

  // Debounced SKU availability check
  useEffect(() => {
    if (!sku.trim()) {
      setSkuAvailable(null);
      return;
    }
    const handle = setTimeout(() => {
      setCheckingSku(true);
      fetch(
        `/api/admin/products/sku-check?sku=${encodeURIComponent(sku)}&exclude=${
          product.id
        }`
      )
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => setSkuAvailable(!!d.available))
        .catch(() => setSkuAvailable(null))
        .finally(() => setCheckingSku(false));
    }, 400);
    return () => clearTimeout(handle);
  }, [sku, product.id]);

  // Derived duplicate size detection
  const sizeLabelCollision = (() => {
    const labels = sizes.map((s: SizeInput) => s.label.trim()).filter(Boolean);
    return new Set(labels).size !== labels.length;
  })();

  function updateImage(idx: number, patch: Partial<ImageInput>) {
    setImages((prev: ImageInput[]) =>
      prev.map((im: ImageInput, i: number) =>
        i === idx ? { ...im, ...patch } : im
      )
    );
  }
  function addImage() {
    setImages((p: ImageInput[]) => [
      ...p,
      { url: "", alt: null, position: p.length },
    ]);
  }
  function removeImage(i: number) {
    setImages((p: ImageInput[]) =>
      p.filter((_: ImageInput, idx: number) => idx !== i)
    );
  }
  function moveImage(i: number, dir: -1 | 1) {
    setImages((p: ImageInput[]) => {
      const arr = [...p];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return p;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }
  const onDragStart = useCallback(
    (index: number) => () => {
      setDragIndex(index);
    },
    []
  );
  const onDragOver = useCallback(
    (index: number) => (e: React.DragEvent) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === index) return;
      setImages((p: ImageInput[]) => {
        const arr = [...p];
        const [moved] = arr.splice(dragIndex, 1);
        arr.splice(index, 0, moved);
        return arr;
      });
      setDragIndex(index);
    },
    [dragIndex]
  );
  const onDragEnd = useCallback(() => {
    setDragIndex(null);
  }, []);

  // Auto-save image order (debounced) when images array changes (positions)
  useEffect(() => {
    // Only trigger after initial load (skip if saving currently or no product id)
    if (!product?.id) return;
    const handle = setTimeout(() => {
      // Only send order if at least one image has position different from index
      const payloadImages = images.map((im: ImageInput, idx: number) => ({
        url: im.url.trim(),
        alt: im.alt?.trim() || undefined,
        position: idx,
      }));
      fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: sku.trim(),
          name: name.trim(),
          description: description.trim(),
          priceCents: Math.round(parseFloat(price || "0") * 100) || 0,
          brandId: brandId || undefined,
          categoryId: categoryId || undefined,
          gender: gender || undefined,
          isJersey,
          jerseyConfig: jerseyConfig || undefined,
          images: payloadImages,
          sizes: sizes
            .filter((s: SizeInput) => s.label.trim())
            .map((s: SizeInput) => ({
              label: s.label.trim(),
              stock: s.stock || 0,
            })),
        }),
      }).catch(() => {});
    }, 900);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);
  function updateSize(idx: number, patch: Partial<SizeInput>) {
    setSizes((prev: SizeInput[]) =>
      prev.map((s: SizeInput, i: number) =>
        i === idx ? { ...s, ...patch } : s
      )
    );
  }
  function addSize() {
    setSizes((p: SizeInput[]) => [...p, { label: "", stock: 0 }]);
  }
  function removeSize(i: number) {
    setSizes((p: SizeInput[]) =>
      p.filter((_: SizeInput, idx: number) => idx !== i)
    );
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (sizeLabelCollision) {
        setError("Duplicate size labels");
        setSaving(false);
        return;
      }
      if (skuAvailable === false) {
        setError("SKU not available");
        setSaving(false);
        return;
      }
      const priceFloat = parseFloat(price);
      const payload = {
        sku: sku.trim(),
        name: name.trim(),
        description: description.trim(),
        priceCents: isNaN(priceFloat) ? 0 : Math.round(priceFloat * 100),
        brandId: brandId || undefined,
        categoryId: categoryId || undefined,
        gender: gender || undefined,
        productType: productType || undefined,
        isJersey,
        jerseyConfig: jerseyConfig || undefined,
        images: images
          .filter((i) => i.url.trim())
          .map((im, idx) => ({
            url: im.url.trim(),
            alt: im.alt?.trim() || undefined,
            position: idx,
          })),
        sizes: sizes
          .filter((s) => s.label.trim())
          .map((s) => ({ label: s.label.trim(), stock: s.stock || 0 })),
      };
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "sku_exists") setError("SKU already exists");
        else if (data.error === "invalid_payload")
          setError("Validation failed");
        else if (data.error === "forbidden") setError("Not an admin");
        else if (data.error === "unauthorized") setError("Sign in required");
        else setError("Update failed");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm("Soft delete this product? It can be restored later.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleted(true);
        router.refresh();
      } else setError("Delete failed");
    } catch {
      setError("Network error");
    } finally {
      setDeleting(false);
    }
  }

  async function onRestore() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/restore`, {
        method: "POST",
      });
      if (res.ok) {
        setDeleted(false);
        router.refresh();
      } else setError("Restore failed");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-8">
      <section className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">SKU</label>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            required
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Brand</label>
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">(None)</option>
            {metaBrands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">(None)</option>
            {metaCategories.map((c) => {
              const parent = metaCategories.find((p) => p.id === c.parentId);
              const label = parent ? `${parent.name} / ${c.name}` : c.name;
              return (
                <option key={c.id} value={c.id}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Product Type</label>
          <select
            value={productType}
            onChange={(e) => {
              setProductType(e.target.value);
              setGender(""); // Reset gender when product type changes
            }}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">Select Product Type</option>
            <option value="clothing">Clothing</option>
            <option value="shoes">Shoes</option>
            <option value="accessories">Accessories</option>
          </select>
        </div>
        {(productType === "clothing" || productType === "shoes") && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Select Gender</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>
        )}
        {productType === "accessories" && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Select Gender</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>
        )}
        <div className="space-y-1 max-w-xs">
          <label className="text-sm font-medium">Price ({BASE_CURRENCY})</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">£</span>
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="w-full border rounded pl-7 pr-3 py-2 text-sm"
              placeholder="0.00"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Stored in {BASE_CURRENCY} minor units (cents) and converted
            client-side if user selects another currency.
          </p>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="font-medium text-sm uppercase tracking-wide">
          Description
        </h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </section>
      <section className="space-y-3">
        <h2 className="font-medium text-sm uppercase tracking-wide">
          Jersey Options
        </h2>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isJersey}
            onChange={(e) => setIsJersey(e.target.checked)}
          />
          Mark as Jersey (enable customizations)
        </label>
        {isJersey && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">Jersey Options</label>
            <JerseyOptionsEditor
              value={jerseyConfig}
              onChange={(json) => setJerseyConfig(json)}
            />
          </div>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="font-medium text-sm uppercase tracking-wide">Images</h2>
        <div className="space-y-4">
          {images.map((img, i) => (
            <div
              key={i}
              className={`grid md:grid-cols-2 gap-3 items-start border rounded p-2 ${
                dragIndex === i ? "bg-neutral-50" : ""
              }`}
              draggable
              onDragStart={onDragStart(i)}
              onDragOver={onDragOver(i)}
              onDragEnd={onDragEnd}
            >
              <input
                placeholder="Image URL"
                value={img.url}
                onChange={(e) => updateImage(i, { url: e.target.value })}
                required={i === 0}
                className="border rounded px-3 py-2 text-sm"
              />
              <div className="flex gap-2 items-start">
                <input
                  placeholder="Alt text"
                  value={img.alt || ""}
                  onChange={(e) => updateImage(i, { alt: e.target.value })}
                  className="border rounded px-3 py-2 text-sm flex-1"
                />
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => moveImage(i, -1)}
                    disabled={i === 0}
                    className="text-[10px] px-2 py-1 border rounded disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(i, 1)}
                    disabled={i === images.length - 1}
                    className="text-[10px] px-2 py-1 border rounded disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
                {images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="text-xs text-red-600 underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addImage}
            className="text-xs underline"
          >
            + Add Image
          </button>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="font-medium text-sm uppercase tracking-wide dark:text-white">
          Sizes
        </h2>
        <div className="space-y-3">
          {sizes.map((s, i) => (
            <div key={i} className="flex gap-3 items-center">
              <input
                placeholder="Label"
                value={s.label}
                onChange={(e) => updateSize(i, { label: e.target.value })}
                className="border dark:border-neutral-600 rounded px-3 py-2 text-sm w-32 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
              <input
                type="number"
                min={0}
                value={s.stock}
                onChange={(e) =>
                  updateSize(i, { stock: parseInt(e.target.value || "0", 10) })
                }
                className="border dark:border-neutral-600 rounded px-3 py-2 text-sm w-28 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
              {sizes.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSize(i)}
                  className="text-xs text-red-600 dark:text-red-400 underline"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addSize} className="text-xs underline">
            + Add Size
          </button>
        </div>
      </section>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="text-xs space-x-2">
        {checkingSku && <span className="text-neutral-500">Checking SKU…</span>}
        {sku && skuAvailable === true && (
          <span className="text-green-600">SKU available</span>
        )}
        {sku && skuAvailable === false && (
          <span className="text-red-600">SKU taken</span>
        )}
        {sizeLabelCollision && (
          <span className="text-red-600">Duplicate size labels</span>
        )}
        {deleted && <span className="text-yellow-600">(Deleted)</span>}
      </div>
      <div className="flex gap-3 items-center">
        <button
          disabled={saving}
          type="submit"
          className="rounded bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {!deleted && (
          <button
            disabled={deleting}
            type="button"
            onClick={onDelete}
            className="text-sm text-red-600 underline disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Product"}
          </button>
        )}
        {deleted && (
          <button
            type="button"
            onClick={onRestore}
            className="text-sm text-green-600 underline"
          >
            Restore
          </button>
        )}
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="text-sm underline"
        >
          Back
        </button>
      </div>
    </form>
  );
}
