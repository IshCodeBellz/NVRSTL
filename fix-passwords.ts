import { prisma } from "./lib/server/prisma";
import { hash } from "bcryptjs";

async function fixUserPasswords() {
  console.log("🔧 Fixing user passwords...");

  const testPassword = "user123";
  const hashedPassword = await hash(testPassword, 12);

  // Update john's password
  await prisma.user.update({
    where: { email: "john@example.com" },
    data: { passwordHash: hashedPassword },
  });

  // Update jane's password
  await prisma.user.update({
    where: { email: "jane@example.com" },
    data: { passwordHash: hashedPassword },
  });

  console.log("✅ Updated passwords for test users");

  // Verify the fix
  const john = await prisma.user.findUnique({
    where: { email: "john@example.com" },
  });

  if (john) {
    const { compare } = await import("bcryptjs");
    const isValid = await compare(testPassword, john.passwordHash);
    console.log("🔐 John's password verification:", isValid);
  }

  const jane = await prisma.user.findUnique({
    where: { email: "jane@example.com" },
  });

  if (jane) {
    const { compare } = await import("bcryptjs");
    const isValid = await compare(testPassword, jane.passwordHash);
    console.log("🔐 Jane's password verification:", isValid);
  }

  console.log("\n✅ User passwords fixed! You can now login with:");
  console.log("📧 john@example.com / user123");
  console.log("📧 jane@example.com / user123");
  console.log("📧 admin@dyofficial.com / admin123");
}

fixUserPasswords()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
