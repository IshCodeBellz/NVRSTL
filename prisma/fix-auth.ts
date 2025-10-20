import { prisma } from "../lib/server/prisma";
import { hash, compare } from "bcryptjs";

/**
 * Test and Fix User Authentication
 */

async function main() {
  console.log("🔍 Testing user authentication...");

  // Check what users exist
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, passwordHash: true },
  });

  console.log("📋 Users in database:");
  users.forEach((user) => {
    console.log(
      `- ${user.email} (${user.name || "No name"}) - Hash length: ${
        user.passwordHash?.length || "No hash"
      }`
    );
  });

  // Test password verification for each user
  console.log("\n🔐 Testing password verification:");

  const testPasswords = {
    "admin@dyofficial.com": "admin123",
    "john@example.com": "user123",
    "jane@example.com": "user123",
  };

  for (const [email, password] of Object.entries(testPasswords)) {
    const user = users.find((u) => u.email === email);
    if (user && user.passwordHash) {
      try {
        const isValid = await compare(password, user.passwordHash);
        console.log(`${email}: ${isValid ? "✅ VALID" : "❌ INVALID"}`);

        if (!isValid) {
          console.log(`  → Fixing password for ${email}...`);
          const newHash = await hash(password, 12);
          await prisma.user.update({
            where: { email },
            data: { passwordHash: newHash },
          });
          console.log(`  → ✅ Fixed password for ${email}`);
        }
      } catch (error) {
      console.error("Error:", error);
        console.log(`${email}: ❌ ERROR - ${(error as any)?.message || error}`);
      }
    } else {
      console.log(`${email}: ❌ USER NOT FOUND OR NO PASSWORD HASH`);
    }
  }

  console.log("\n🧪 Testing after fixes:");

  // Re-test all passwords
  const updatedUsers = await prisma.user.findMany({
    select: { id: true, email: true, passwordHash: true },
  });

  for (const [email, password] of Object.entries(testPasswords)) {
    const user = updatedUsers.find((u) => u.email === email);
    if (user && user.passwordHash) {
      const isValid = await compare(password, user.passwordHash);
      console.log(`${email}: ${isValid ? "✅ NOW VALID" : "❌ STILL INVALID"}`);
    }
  }

  console.log("\n🎉 Authentication test completed!");
  console.log("\n📝 **LOGIN CREDENTIALS:**");
  console.log("🔧 Admin: admin@dyofficial.com / admin123");
  console.log("👤 Test User 1: john@example.com / user123");
  console.log("👤 Test User 2: jane@example.com / user123");
}

main()
  .catch((e) => {
    console.error("❌ Error testing authentication:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
