const { PrismaClient } = require("@prisma/client");
const { hash } = require("bcryptjs");

const prisma = new PrismaClient();

async function createTestAdmin() {
  try {
    // Check if admin exists
    const existingAdmin = await prisma.user.findFirst({
      where: { isAdmin: true },
    });

    if (existingAdmin) {
      console.log("✅ Admin user already exists:", existingAdmin.email);
      console.log("   Password: Use the existing password or reset if needed");
      return;
    }

    console.log("Creating test admin user...");
    const passwordHash = await hash("admin123", 12);

    const admin = await prisma.user.create({
      data: {
        email: "admin@dyofficial.com",
        name: "Test Admin",
        passwordHash,
        isAdmin: true,
        emailVerified: true,
        failedLoginAttempts: 0,
      },
    });

    console.log("✅ Created admin user successfully!");
    console.log("   Email: admin@dyofficial.com");
    console.log("   Password: admin123");
    console.log("   Admin: true");
    console.log("");
    console.log("You can now login at: http://localhost:3001/login");
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAdmin();
