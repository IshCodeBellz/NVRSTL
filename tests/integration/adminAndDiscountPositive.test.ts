import { resetDb } from "../helpers/testServer";
import { prisma } from "@/lib/server/prisma";
import * as productsRoute from "@/app/api/admin/products/route";
import * as discountCodesRoute from "@/app/api/discount-codes/route";
import { NextRequest } from "next/server";

// Allow more time because resetDb + multiple creations can exceed default 5s in CI
jest.setTimeout(15000);

beforeAll(async () => {
  await resetDb();
});

function jsonReq(url: string, body: any) {
  return new NextRequest(new URL("http://localhost:3000" + url), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  } as any);
}

describe("admin products positive", () => {
  test("creates a product with images and sizes", async () => {
    // Force admin session
    const { getServerSession } = require("next-auth");
    (getServerSession as jest.Mock).mockImplementationOnce(async () => ({
      user: { id: "admin-u", email: "admin@example.com", isAdmin: true },
    }));
    // Ensure user exists & is admin in DB (route fetches user record)
    await prisma.user.create({
      data: {
        id: "admin-u",
        email: "admin@example.com",
        passwordHash: "x",
        isAdmin: true,
      },
    });
    const body = {
      sku: "SKU-ABC1",
      name: "Prod 1",
      description: "Desc",
      priceCents: 1234,
      images: [{ url: "https://example.com/a.png" }],
      sizes: [
        { label: "M", stock: 5 },
        { label: "L", stock: 2 },
      ],
    };
    const req = jsonReq("/api/admin/products", body);
    const res: any = await (productsRoute as any).POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.product.sku).toBe("SKU-ABC1");
    expect(json.product.images.length).toBe(1);
    expect(json.product.sizeVariants.length).toBe(2);
  });
});

describe("discount codes route", () => {
  test("creates fixed discount code", async () => {
    const req = jsonReq("/api/discount-codes", {
      code: "FIX10",
      kind: "FIXED",
      valueCents: 1000,
    });
    const res: any = await (discountCodesRoute as any).POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.code.code).toBe("FIX10");
  });
  test("creates percent discount code", async () => {
    const req = jsonReq("/api/discount-codes", {
      code: "PERC5",
      kind: "PERCENT",
      percent: 5,
    });
    const res: any = await (discountCodesRoute as any).POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.code.percent).toBe(5);
  });
  test("rejects missing required value for fixed kind", async () => {
    const req = jsonReq("/api/discount-codes", {
      code: "BADFIX",
      kind: "FIXED",
    });
    const res: any = await (discountCodesRoute as any).POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("missing_valueCents");
  });
});
