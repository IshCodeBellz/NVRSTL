import * as route from "@/app/api/admin/orders/[id]/fulfill/start/route";
import { NextRequest } from "next/server";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/server/shipping/FulfillmentService", () => ({
  FulfillmentService: {
    processOrderForFulfillment: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@/lib/server/events/adminEvents", () => ({
  broadcast: jest.fn(),
}));

describe("start fulfillment route", () => {
  const makeReq = (id: string) =>
    new NextRequest(
      new URL(`http://localhost:3000/api/admin/orders/${id}/fulfill/start`),
      { method: "POST" } as any
    );

  test("rejects non-admin users", async () => {
    const { getServerSession } = require("next-auth");
    getServerSession.mockResolvedValue({ user: { isAdmin: false } });
    const res: any = await (route as any).POST(makeReq("ord-1"), {
      params: { id: "ord-1" },
    });
    expect(res.status).toBe(401);
  });

  test("starts fulfillment and broadcasts event for admin", async () => {
    const { getServerSession } = require("next-auth");
    const {
      FulfillmentService,
    } = require("@/lib/server/shipping/FulfillmentService");
    const { broadcast } = require("@/lib/server/events/adminEvents");
    getServerSession.mockResolvedValue({ user: { isAdmin: true } });
    const res: any = await (route as any).POST(makeReq("ord-2"), {
      params: { id: "ord-2" },
    });
    expect(res.status).toBe(200);
    expect(FulfillmentService.processOrderForFulfillment).toHaveBeenCalledWith(
      "ord-2"
    );
    expect(broadcast).toHaveBeenCalledWith("order-status", {
      orderId: "ord-2",
      status: "FULFILLING",
    });
  });
});
