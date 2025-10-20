/**
 * Test NextAuth credentials directly
 */
import { NextRequest } from "next/server";

export async function testAuthFlow() {
  console.log("🧪 Testing NextAuth credentials flow...");

  // Create a mock request to test the auth flow
  const testUrl = "http://localhost:3000/api/auth/signin/credentials";

  try {
    const response = await fetch(testUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "test@example.com",
        password: "wrongpassword",
        callbackUrl: "http://localhost:3000",
      }),
    });

    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (response.redirected) {
      console.log("Redirected to:", response.url);
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Only run if this is the main module
if (require.main === module) {
  testAuthFlow();
}
