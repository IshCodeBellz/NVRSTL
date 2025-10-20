import { resetDb } from "../helpers/testServer";
import { prisma } from "@/lib/server/prisma";
import * as productsIndexRoute from "@/app/api/products/route";
import { NextRequest } from "next/server";

jest.setTimeout(15000);

beforeAll(async () => {
  await resetDb();

  // Create brand and categories that match our new subcategories
  const testBrand = await prisma.brand.create({
    data: { name: "Test Brand" },
  });

  const womenDresses = await prisma.category.create({
    data: { slug: "women-dresses", name: "Women's Dresses" },
  });

  const menShirts = await prisma.category.create({
    data: { slug: "men-shirts", name: "Men's Shirts" },
  });

  const unisexAccessories = await prisma.category.create({
    data: { slug: "unisex-accessories", name: "Unisex Accessories" },
  });

  // Create test products in specific subcategories
  await prisma.product.create({
    data: {
      sku: "DRESS-001",
      name: "Summer Dress",
      description: "Beautiful summer dress",
      priceCents: 8000,
      brandId: testBrand.id,
      categoryId: womenDresses.id,
      gender: "women",
      isActive: true,
      images: {
        create: [{ url: "https://example.com/dress.jpg", position: 0 }],
      },
      sizeVariants: { create: [{ label: "M", stock: 10 }] },
    },
  });

  await prisma.product.create({
    data: {
      sku: "SHIRT-001",
      name: "Casual Shirt",
      description: "Comfortable casual shirt",
      priceCents: 5000,
      brandId: testBrand.id,
      categoryId: menShirts.id,
      gender: "men",
      isActive: true,
      images: {
        create: [{ url: "https://example.com/shirt.jpg", position: 0 }],
      },
      sizeVariants: { create: [{ label: "L", stock: 8 }] },
    },
  });

  await prisma.product.create({
    data: {
      sku: "HAT-001",
      name: "Unisex Cap",
      description: "Stylish unisex cap",
      priceCents: 2500,
      brandId: testBrand.id,
      categoryId: unisexAccessories.id,
      gender: "unisex",
      isActive: true,
      images: { create: [{ url: "https://example.com/hat.jpg", position: 0 }] },
      sizeVariants: { create: [{ label: "OS", stock: 20 }] },
    },
  });
});

function makeGet(url: string) {
  return new NextRequest(new URL("http://localhost:3000" + url), {
    method: "GET",
  } as any);
}

describe("Gender-specific subcategory filtering", () => {
  test("women's dresses category filters correctly", async () => {
    const req = makeGet("/api/products?category=women-dresses&gender=women");
    const res: any = await (productsIndexRoute as any).GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.items.length).toBe(1);
    expect(json.items[0].name).toBe("Summer Dress");
  });

  test("men's shirts category filters correctly", async () => {
    const req = makeGet("/api/products?category=men-shirts&gender=men");
    const res: any = await (productsIndexRoute as any).GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.items.length).toBe(1);
    expect(json.items[0].name).toBe("Casual Shirt");
  });

  test("unisex accessories appear in both men's and women's results", async () => {
    // Test with women's filter - should include unisex items
    const womenReq = makeGet(
      "/api/products?category=unisex-accessories&gender=women"
    );
    const womenRes: any = await (productsIndexRoute as any).GET(womenReq);
    const womenJson = await womenRes.json();

    // Test with men's filter - should include unisex items
    const menReq = makeGet(
      "/api/products?category=unisex-accessories&gender=men"
    );
    const menRes: any = await (productsIndexRoute as any).GET(menReq);
    const menJson = await menRes.json();

    expect(womenJson.items.length).toBe(1);
    expect(menJson.items.length).toBe(1);
    expect(womenJson.items[0].name).toBe("Unisex Cap");
    expect(menJson.items[0].name).toBe("Unisex Cap");
  });

  test("category filtering without gender shows all relevant items", async () => {
    const req = makeGet("/api/products?category=women-dresses");
    const res: any = await (productsIndexRoute as any).GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.items.length).toBe(1);
    expect(json.items[0].name).toBe("Summer Dress");
  });
});
