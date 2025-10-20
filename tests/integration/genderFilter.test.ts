import { resetDb } from "../helpers/testServer";
import { prisma } from "@/lib/server/prisma";
import * as productsIndexRoute from "@/app/api/products/route";
import { NextRequest } from "next/server";

jest.setTimeout(15000);

beforeAll(async () => {
  await resetDb();

  // Create a test brand first
  const testBrand = await prisma.brand.create({
    data: {
      name: "Test Brand",
    },
  });

  // Seed minimal categories
  const womens = await prisma.category.create({
    data: { slug: "womens-clothing", name: "Women's Clothing" },
  });
  const mens = await prisma.category.create({
    data: { slug: "mens-clothing", name: "Men's Clothing" },
  });

  // Create products with gender values, brand, and category
  await prisma.product.create({
    data: {
      sku: "WOM-001",
      name: "Women Jacket",
      description: "Jacket",
      priceCents: 10000,
      brandId: testBrand.id,
      categoryId: womens.id,
      gender: "women",
      isActive: true,
      images: { create: [{ url: "https://example.com/w1.jpg", position: 0 }] },
      sizeVariants: { create: [{ label: "S", stock: 10 }] },
    },
  });
  await prisma.product.create({
    data: {
      sku: "UNI-001",
      name: "Unisex Cap",
      description: "Cap",
      priceCents: 2500,
      brandId: testBrand.id,
      categoryId: mens.id,
      gender: "unisex",
      isActive: true,
      images: { create: [{ url: "https://example.com/u1.jpg", position: 0 }] },
      sizeVariants: { create: [{ label: "ONE", stock: 15 }] },
    },
  });
  await prisma.product.create({
    data: {
      sku: "MEN-001",
      name: "Men Chino",
      description: "Chino",
      priceCents: 4500,
      brandId: testBrand.id,
      categoryId: mens.id,
      gender: "men",
      isActive: true,
      images: { create: [{ url: "https://example.com/m1.jpg", position: 0 }] },
      sizeVariants: { create: [{ label: "32", stock: 8 }] },
    },
  });
});

function makeGet(url: string) {
  return new NextRequest(new URL("http://localhost:3000" + url), {
    method: "GET",
  } as any);
}

describe("/api/products gender filter", () => {
  test("gender=women returns women + unisex only", async () => {
    const req = makeGet("/api/products?gender=women");
    const res: any = await (productsIndexRoute as any).GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toBeTruthy();
    expect(Array.isArray(json.items)).toBe(true);

    // Check by product names since sku is not returned in API response
    const womensProduct = json.items.find(
      (p: any) => p.name === "Women Jacket"
    );
    const unisexProduct = json.items.find((p: any) => p.name === "Unisex Cap");
    const mensProduct = json.items.find((p: any) => p.name === "Men Chino");

    expect(womensProduct).toBeTruthy();
    expect(unisexProduct).toBeTruthy();
    expect(mensProduct).toBeFalsy();

    // Should only return 2 products (women + unisex)
    expect(json.items.length).toBe(2);
  });

  test("gender=men returns men + unisex only", async () => {
    const req = makeGet("/api/products?gender=men");
    const res: any = await (productsIndexRoute as any).GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toBeTruthy();
    expect(Array.isArray(json.items)).toBe(true);

    // Check by product names since sku is not returned in API response
    const womensProduct = json.items.find(
      (p: any) => p.name === "Women Jacket"
    );
    const unisexProduct = json.items.find((p: any) => p.name === "Unisex Cap");
    const mensProduct = json.items.find((p: any) => p.name === "Men Chino");

    expect(womensProduct).toBeFalsy();
    expect(unisexProduct).toBeTruthy();
    expect(mensProduct).toBeTruthy();

    // Should only return 2 products (men + unisex)
    expect(json.items.length).toBe(2);
  });

  test("no gender param returns all", async () => {
    const req = makeGet("/api/products");
    const res: any = await (productsIndexRoute as any).GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    // Check by product names since sku is not returned in API response
    expect(json.items.some((p: any) => p.name === "Women Jacket")).toBeTruthy();
    expect(json.items.some((p: any) => p.name === "Unisex Cap")).toBeTruthy();
    expect(json.items.some((p: any) => p.name === "Men Chino")).toBeTruthy();

    // Should return all 3 products
    expect(json.items.length).toBe(3);
  });
});
