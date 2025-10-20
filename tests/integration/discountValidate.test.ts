import {
  invokeGET,
  resetDb,
  createDiscountFixed,
  createDiscountPercent,
} from "../helpers/testServer";
import * as validateRoute from "@/app/api/discount-codes/validate/route";

beforeEach(async () => {
  await resetDb();
});

describe("discount validate endpoint", () => {
  test("returns not_found for unknown code", async () => {
    const res = await invokeGET(
      validateRoute,
      "/api/discount-codes/validate?code=NOPE"
    );
    const json: any = await (res as any).json();
    expect(json.valid).toBe(false);
    expect(json.reason).toBe("not_found");
  });

  test("valid fixed discount", async () => {
    await createDiscountFixed("SAVE10", 1000);
    const res = await invokeGET(
      validateRoute,
      "/api/discount-codes/validate?code=save10"
    );
    const json: any = await (res as any).json();
    expect(json.valid).toBe(true);
    expect(json.kind).toBe("FIXED");
    expect(json.valueCents).toBe(1000);
  });

  test("valid percent discount is case-insensitive", async () => {
    await createDiscountPercent("TENOFF", 10);
    const res = await invokeGET(
      validateRoute,
      "/api/discount-codes/validate?code=TenOff"
    );
    const json: any = await (res as any).json();
    expect(json.valid).toBe(true);
    expect(json.kind).toBe("PERCENT");
    expect(json.percent).toBe(10);
  });
});
