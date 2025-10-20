import { NextRequest } from "next/server";
import TestErrorPage from "@/app/test-error/page";

// We can't fully render the App Router tree in this lightweight harness, but we can assert the component throws.

describe("error boundary surface", () => {
  test("test-error page throws", () => {
    expect(() => TestErrorPage()).toThrow("Test induced failure");
  });
});
