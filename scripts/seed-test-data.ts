/*
	Local test data seeder
	- Safe, idempotent-ish (upsert where appropriate)
	- Reflects updated schema: Shipment, OrderItem.priceCentsSnapshot, MfaDevice canonical storage
*/
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function cents(n: number) {
  return Math.round(n * 100);
}

async function main() {
  console.log("Seeding local test data...");

  // Brands
  const brand = await prisma.brand.upsert({
    where: { name: "DY Basics" },
    update: {},
    create: { name: "DY Basics", description: "Essentials by DY" },
  });

  // Categories
  const cat = await prisma.category.upsert({
    where: { slug: "tees" },
    update: {},
    create: { slug: "tees", name: "Tees", description: "T-Shirts" },
  });

  // Products
  const product = await prisma.product.upsert({
    where: { sku: "TEE-BASIC-BLK" },
    update: {},
    create: {
      sku: "TEE-BASIC-BLK",
      name: "Basic Black Tee",
      description: "Soft cotton crew neck",
      priceCents: cents(19.99),
      brandId: brand.id,
      categoryId: cat.id,
      images: {
        create: [
          { url: "https://picsum.photos/seed/tee-basic/600/800", alt: "Front" },
        ],
      },
    },
    include: { images: true },
  });

  // Size variants
  const sizes = ["S", "M", "L"];
  for (const label of sizes) {
    await prisma.sizeVariant.upsert({
      where: { productId_label: { productId: product.id, label } },
      update: {},
      create: { productId: product.id, label, stock: 50 },
    });
  }

  // A color variant (example)
  const variant = await prisma.productVariant.upsert({
    where: { sku: "TEE-BASIC-BLK-V1" },
    update: {},
    create: {
      productId: product.id,
      sku: "TEE-BASIC-BLK-V1",
      name: "Black",
      type: "color",
      value: "black",
      stock: 100,
    },
  });

  // Test user
  const user = await prisma.user.upsert({
    where: { email: "seedtester@example.com" },
    update: {},
    create: {
      email: "seedtester@example.com",
      passwordHash: "demo-local-hash", // not used in prod
      name: "Seed Tester",
      emailVerified: true,
      mfaEnabled: true,
    },
  });

  // MFA device (canonical store for secret/backup codes)
  await prisma.mfaDevice.upsert({
    where: { userId_method: { userId: user.id, method: "TOTP" } },
    update: {
      status: "ENABLED",
      secret: "JBSWY3DPEHPK3PXP", // dummy base32
      backupCodes: JSON.stringify(["ABCD-1234", "EFGH-5678"]),
      failedAttempts: 0,
    },
    create: {
      userId: user.id,
      method: "TOTP",
      status: "ENABLED",
      secret: "JBSWY3DPEHPK3PXP",
      backupCodes: JSON.stringify(["ABCD-1234", "EFGH-5678"]),
    },
  });

  // Address
  const addr = await prisma.address.create({
    data: {
      userId: user.id,
      fullName: "Seed Tester",
      line1: "1 Demo Street",
      city: "Testville",
      region: "TS",
      postalCode: "00001",
      country: "US",
      isDefault: true,
    },
  });

  // Order with required fields and snapshot cents
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      status: "PAID",
      subtotalCents: cents(19.99),
      taxCents: 0,
      shippingCents: 0,
      discountCents: 0,
      totalCents: cents(19.99),
      currency: "USD",
      email: user.email,
      paidAt: new Date(),
      shippedAt: new Date(),
      shippingAddressId: addr.id,
      billingAddressId: addr.id,
      items: {
        create: [
          {
            productId: product.id,
            variantId: variant.id,
            sku: product.sku,
            nameSnapshot: product.name,
            size: "M",
            qty: 1,
            unitPriceCents: product.priceCents,
            priceCentsSnapshot: product.priceCents,
            lineTotalCents: product.priceCents,
          },
        ],
      },
    },
    include: { items: true },
  });

  // Shipment
  await prisma.shipment.create({
    data: {
      orderId: order.id,
      trackingNumber: `TRK-${Math.random()
        .toString(36)
        .slice(2, 10)
        .toUpperCase()}`,
      carrier: "UPS",
      service: "GROUND",
      cost: 0,
      currency: "GBP",
      status: "LABEL_CREATED",
    },
  });

  console.log("Seed complete:", {
    brand: brand.name,
    category: cat.slug,
    product: product.sku,
    user: user.email,
    order: order.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
