import { prisma } from "./lib/server/prisma";
import { verifyPassword } from "./lib/server/auth";

async function testAuth() {
  console.log("🔐 Testing authentication...");

  // Test user lookup
  const user = await prisma.user.findUnique({
    where: { email: "john@example.com" },
  });

  if (!user) {
    console.log("❌ User not found");
    return;
  }

  console.log("✅ User found:", user.email);
  console.log("Password hash:", user.passwordHash);

  // Test password verification
  const testPassword = "user123";
  const isValid = await verifyPassword(testPassword, user.passwordHash);

  console.log("Password verification result:", isValid);

  if (isValid) {
    console.log("✅ Password verification successful!");
  } else {
    console.log("❌ Password verification failed!");
  }

  // Test admin user too
  const admin = await prisma.user.findUnique({
    where: { email: "admin@dyofficial.com" },
  });

  if (admin) {
    console.log("\n🔐 Testing admin account...");
    console.log("✅ Admin found:", admin.email);
    const adminValid = await verifyPassword("admin123", admin.passwordHash);
    console.log("Admin password verification:", adminValid);
  }
}

testAuth()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
