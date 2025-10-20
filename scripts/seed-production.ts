// @ts-nocheck

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedProductionData() {
  console.log("🌱 Starting production data seeding...");

  try {
    // Ensure essential categories exist
    console.log("📂 Creating essential categories...");

    const categories = [
      { name: "Women", slug: "women", description: "Women's Fashion" },
      { name: "Men", slug: "men", description: "Men's Fashion" },
      {
        name: "Accessories",
        slug: "accessories",
        description: "Fashion Accessories",
      },
      { name: "Shoes", slug: "shoes", description: "Footwear" },
      { name: "Bags", slug: "bags", description: "Handbags & Accessories" },
    ];

    for (const categoryData of categories) {
      const existingCategory = await prisma.category.findUnique({
        where: { slug: categoryData.slug },
      });

      if (!existingCategory) {
        await prisma.category.create({
          data: {
            name: categoryData.name,
            slug: categoryData.slug,
            description: categoryData.description,
            isActive: true,
          },
        });
        console.log(`✅ Created category: ${categoryData.name}`);
      } else {
        console.log(`⏩ Category already exists: ${categoryData.name}`);
      }
    }

    // Ensure essential brands exist
    console.log("🏷️ Creating essential brands...");

    const brands = [
      {
        name: "DY Official",
        slug: "dy-official",
        description: "DY Official Brand",
        isFeatured: true,
      },
    ];

    for (const brandData of brands) {
      const existingBrand = await prisma.brand.findUnique({
        where: { slug: brandData.slug },
      });

      if (!existingBrand) {
        await prisma.brand.create({
          data: {
            name: brandData.name,
            slug: brandData.slug,
            description: brandData.description,
            isActive: true,
            isFeatured: brandData.isFeatured || false,
          },
        });
        console.log(`✅ Created brand: ${brandData.name}`);
      } else {
        console.log(`⏩ Brand already exists: ${brandData.name}`);
      }
    }

    // Create essential system settings
    console.log("⚙️ Setting up system configuration...");

    // Shipping configuration
    const shippingMethods = [
      {
        name: "Standard Shipping",
        description: "5-7 business days",
        price: 999, // $9.99 in cents
        estimatedDays: 7,
        isActive: true,
      },
      {
        name: "Express Shipping",
        description: "2-3 business days",
        price: 1999, // $19.99 in cents
        estimatedDays: 3,
        isActive: true,
      },
      {
        name: "Next Day Delivery",
        description: "Next business day",
        price: 2999, // $29.99 in cents
        estimatedDays: 1,
        isActive: false, // Disabled by default for production
      },
    ];

    for (const method of shippingMethods) {
      const existingMethod = await prisma.shippingMethod.findFirst({
        where: { name: method.name },
      });

      if (!existingMethod) {
        await prisma.shippingMethod.create({
          data: method,
        });
        console.log(`✅ Created shipping method: ${method.name}`);
      } else {
        console.log(`⏩ Shipping method already exists: ${method.name}`);
      }
    }

    // Create admin user if it doesn't exist
    console.log("👤 Creating admin user...");

    const adminEmail = process.env.ADMIN_EMAIL || "admin@dyofficial.com";
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: "System Administrator",
          role: "ADMIN",
          emailVerified: new Date(),
          isActive: true,
        },
      });
      console.log(`✅ Created admin user: ${adminEmail}`);
      console.log(`⚠️ Remember to set up authentication for this user`);
    } else {
      console.log(`⏩ Admin user already exists: ${adminEmail}`);
    }

    // Initialize essential application settings
    console.log("🔧 Initializing application settings...");

    const settings = [
      { key: "site_name", value: "DY Official", type: "string" },
      { key: "maintenance_mode", value: "false", type: "boolean" },
      { key: "allow_registration", value: "true", type: "boolean" },
      { key: "min_order_amount", value: "2000", type: "number" }, // $20.00 minimum
      { key: "max_order_amount", value: "500000", type: "number" }, // $5000.00 maximum
      { key: "tax_rate", value: "0.08", type: "number" }, // 8% tax rate
      { key: "currency", value: "USD", type: "string" },
      { key: "featured_products_limit", value: "12", type: "number" },
    ];

    for (const setting of settings) {
      try {
        const existingSetting = await prisma.systemSetting.findUnique({
          where: { key: setting.key },
        });

        if (!existingSetting) {
          await prisma.systemSetting.create({
            data: setting,
          });
          console.log(`✅ Created setting: ${setting.key} = ${setting.value}`);
        } else {
          console.log(`⏩ Setting already exists: ${setting.key}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not create setting ${setting.key}:`, error);
      }
    }

    // Create initial payment methods
    console.log("💳 Setting up payment methods...");

    const paymentMethods = [
      {
        name: "Credit Card",
        type: "CARD",
        isActive: true,
        processingFee: 290, // 2.9% + 30¢ (typical Stripe fee)
        description: "Visa, Mastercard, American Express",
      },
      {
        name: "PayPal",
        type: "PAYPAL",
        isActive: false, // Disabled until configured
        processingFee: 290,
        description: "Pay with your PayPal account",
      },
    ];

    for (const method of paymentMethods) {
      try {
        const existingMethod = await prisma.paymentMethod.findFirst({
          where: { name: method.name },
        });

        if (!existingMethod) {
          await prisma.paymentMethod.create({
            data: method,
          });
          console.log(`✅ Created payment method: ${method.name}`);
        } else {
          console.log(`⏩ Payment method already exists: ${method.name}`);
        }
      } catch (error) {
        console.warn(
          `⚠️ Could not create payment method ${method.name}:`,
          error
        );
      }
    }

    // Create essential pages/content
    console.log("📄 Creating essential pages...");

    const pages = [
      {
        slug: "privacy-policy",
        title: "Privacy Policy",
        content: "Privacy policy content goes here...",
        isPublished: true,
      },
      {
        slug: "terms-of-service",
        title: "Terms of Service",
        content: "Terms of service content goes here...",
        isPublished: true,
      },
      {
        slug: "shipping-returns",
        title: "Shipping & Returns",
        content: "Shipping and returns information goes here...",
        isPublished: true,
      },
      {
        slug: "size-guide",
        title: "Size Guide",
        content: "Size guide information goes here...",
        isPublished: true,
      },
    ];

    for (const pageData of pages) {
      try {
        const existingPage = await prisma.page.findUnique({
          where: { slug: pageData.slug },
        });

        if (!existingPage) {
          await prisma.page.create({
            data: pageData,
          });
          console.log(`✅ Created page: ${pageData.title}`);
        } else {
          console.log(`⏩ Page already exists: ${pageData.title}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not create page ${pageData.slug}:`, error);
      }
    }

    console.log("✅ Production data seeding completed successfully!");

    // Print summary
    console.log("\n📊 Summary:");
    const [categoriesCount, brandsCount, usersCount] = await Promise.all([
      prisma.category.count(),
      prisma.brand.count(),
      prisma.user.count(),
    ]);

    console.log(`  📂 Categories: ${categoriesCount}`);
    console.log(`  🏷️ Brands: ${brandsCount}`);
    console.log(`  👤 Users: ${usersCount}`);

    console.log("\n🚀 Your DY Official store is ready for production!");
    console.log("Next steps:");
    console.log("  1. Configure payment processors (Stripe, PayPal)");
    console.log("  2. Set up email services (Resend)");
    console.log("  3. Configure Redis for caching");
    console.log("  4. Add your products and inventory");
    console.log("  5. Test the complete order flow");
  } catch (error) {
    console.error("❌ Production seeding failed:", error);
    throw error;
  }
}

async function main() {
  try {
    await seedProductionData();
  } catch (error) {
    console.error("💥 Seeding process failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}
