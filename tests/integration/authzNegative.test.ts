import * as productsRoute from "@/app/api/admin/products/route";
import * as discountCodesRoute from "@/app/api/discount-codes/route";
import { resetDb } from "../helpers/testServer";
import { NextRequest } from "next/server";

beforeEach(async () => {
  await resetDb();
});

function jsonReq(url: string, body: any, headers: Record<string, string> = {}) {
  return new NextRequest(new URL("http://localhost:3000" + url), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
  } as any);
}

describe("admin authorization negatives", () => {
  test("product create blocked for missing session", async () => {
    // Override global session mock for this invocation to simulate no session
    const { getServerSession } = require("next-auth");
    (getServerSession as jest.Mock).mockImplementationOnce(async () => null);
    const req = jsonReq("/api/admin/products", {
      sku: "ABCD",
      name: "X",
      description: "D",
      priceCents: 1000,
      images: [{ url: "https://example.com/img.png" }],
    });
    const res: any = await (productsRoute as any).POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  test("discount code create blocked for non-admin session", async () => {
    const { getServerSession } = require("next-auth");
    (getServerSession as jest.Mock).mockImplementationOnce(async () => ({
      user: { id: "regular", email: "r@e.com", isAdmin: false },
    }));
    const req = jsonReq("/api/discount-codes", {
      code: "SAVE10",
      kind: "FIXED",
      valueCents: 100,
    });
    const res: any = await (discountCodesRoute as any).POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });
});
