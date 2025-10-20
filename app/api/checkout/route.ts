/* eslint-disable */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import {
  sendOrderConfirmation,
  sendRichOrderConfirmation,
} from "@/lib/server/mailer";
import { z } from "zod";
import { rateLimit } from "@/lib/server/rateLimit";
import { buildDraftFromCart, calculateRates } from "@/lib/server/taxShipping";
import { currencyService } from "@/lib/currency";

export const dynamic = "force-dynamic";
import { decrementSizeStock } from "@/lib/server/inventory";
import { debug } from "@/lib/server/debug";
import { withRequest, error as logError } from "@/lib/server/logger";
import { ExtendedSession, type JerseyCustomization } from "@/lib/types";
import { OrderEventService } from "@/lib/server/orderEventService";
import { validateAndNormalizeAddress } from "@/lib/server/address/validateAddress";

// Basic Phase 3 draft checkout endpoint:
// 1. Reads authenticated user's cart
// 2. Validates stock (size variant stock) & captures snapshots
// 3. Creates Order + OrderItems inside a transaction
// 4. (Payment integration placeholder) returns order id & client summary
// 5. Leaves cart lines intact for now (could clear after successful payment capture later)

const addressSchema = z.object({
  fullName: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  region: z.string().optional(),
  postalCode: z.string().min(1),
  country: z.string().min(2),
  phone: z.string().optional(),
});

const lineSchema = z.object({
  productId: z.string().min(5),
  size: z.string().min(1).optional(),
  qty: z.number().int().min(1).max(99),
});

const payloadSchema = z.object({
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  email: z.string().email().optional(),
  discountCode: z.string().trim().toUpperCase().optional(),
  idempotencyKey: z.string().min(8).max(100).optional(),
  // Optional fallback: client can send current cart lines so server can rebuild if persistence lagged
  lines: z.array(lineSchema).max(200).optional(),
});

export const POST = withRequest(async function POST(req: NextRequest) {
  let session: ExtendedSession | null = null;
  let uid: string | undefined;
  const testUser =
    process.env.NODE_ENV === "test" ? req.headers.get("x-test-user") : null;
  if (testUser) {
    uid = testUser;
    session = {
      user: { id: testUser, email: "test@example.com", isAdmin: true },
      expires: "",
    };
  } else {
    session = (await getServerSession(
      authOptionsEnhanced
    )) as ExtendedSession | null;
    uid = session?.user?.id;
  }
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const bypassRate =
    process.env.NODE_ENV === "test" &&
    req.headers.get("x-test-bypass-rate-limit") === "1";
  if (!bypassRate && !rateLimit(`checkout:${ip}`, 15, 60_000)) {
    debug("CHECKOUT", "rate_limited");
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    debug("CHECKOUT", "invalid_payload", parsed.error.flatten());
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  // Load cart with product & size info
  let cart = await prisma.cart.findUnique({
    where: { userId: uid },
    include: {
      lines: { include: { product: { include: { sizeVariants: true } } } },
    },
  });
  debug("CHECKOUT", "loaded_cart", {
    user: uid,
    cartId: cart?.id,
    lines: cart?.lines.length,
  });
  if (!cart || cart.lines.length === 0) {
    // Attempt fallback rebuild if client provided lines (recent sync race)
    if (parsed.success && parsed.data.lines && parsed.data.lines.length) {
      debug("CHECKOUT", "rebuild_cart_attempt", {
        count: parsed.data.lines.length,
      });
      // Get or create cart record
      cart = await prisma.cart.upsert({
        where: { userId: uid },
        update: {},
        create: { userId: uid },
        include: {
          lines: { include: { product: { include: { sizeVariants: true } } } },
        },
      });
      // Clear any existing (should be zero) then recreate
      await prisma.cartLine.deleteMany({ where: { cartId: cart.id } });
      for (const l of parsed.data.lines) {
        const product = await prisma.product.findUnique({
          where: { id: l.productId },
          include: { sizeVariants: true },
        });
        if (!product || product.deletedAt) continue;
        let finalQty = l.qty;
        if (l.size) {
          const sv = product.sizeVariants.find((s) => s.label === l.size);
          if (!sv) continue;
          finalQty = Math.min(finalQty, sv.stock, 99);
          if (finalQty <= 0) continue;
        } else {
          finalQty = Math.min(finalQty, 99);
        }
        await prisma.cartLine.create({
          data: {
            cartId: cart.id,
            productId: product.id,
            size: l.size,
            qty: finalQty,
            priceCentsSnapshot: product.priceCents,
          },
        });
      }
      cart = await prisma.cart.findUnique({
        where: { userId: uid },
        include: {
          lines: { include: { product: { include: { sizeVariants: true } } } },
        },
      });
      debug("CHECKOUT", "rebuild_cart_result", { lines: cart?.lines.length });
    }
    if (!cart || cart.lines.length === 0) {
      debug("CHECKOUT", "empty_cart");
      return NextResponse.json({ error: "empty_cart" }, { status: 400 });
    }
  }

  // Validate stock + compute totals
  let subtotal = 0;
  const stockErrors: Array<{
    productId: string;
    size?: string;
    available: number;
  }> = [];
  for (const line of cart.lines) {
    const product = line.product;
    if (product.deletedAt) {
      stockErrors.push({
        productId: product.id,
        size: line.size || undefined,
        available: 0,
      });
      continue;
    }
    const sizeVariant = line.size
      ? product.sizeVariants.find((s) => s.label === line.size)
      : undefined;
    const available = sizeVariant ? sizeVariant.stock : 999999; // if no size tracked assume plentiful
    if (line.qty > available) {
      stockErrors.push({
        productId: product.id,
        size: line.size || undefined,
        available,
      });
      continue;
    }
    subtotal += line.priceCentsSnapshot * line.qty;
  }
  if (stockErrors.length) {
    debug("CHECKOUT", "stock_conflict", stockErrors);
    return NextResponse.json(
      { error: "stock_conflict", stockErrors },
      { status: 409 }
    );
  }

  const {
    shippingAddress,
    billingAddress,
    email,
    discountCode,
    idempotencyKey,
  } = parsed.data;

  // Determine selected currency: prefer cookie set by client, else derive from destination country
  const cookieCurrency = req.cookies.get("preferred-currency")?.value;
  const selectedCurrency =
    cookieCurrency && cookieCurrency.length === 3
      ? cookieCurrency.toUpperCase()
      : currencyService.getCurrencyForCountry(shippingAddress.country);

  // Validate/normalize addresses if provider configured
  try {
    const va = await validateAndNormalizeAddress(shippingAddress);
    if (va && va.valid === false) {
      return NextResponse.json({ error: "invalid_address" }, { status: 422 });
    }
    if (va.normalized) Object.assign(shippingAddress, va.normalized);
    if (billingAddress) {
      const vb = await validateAndNormalizeAddress(billingAddress);
      if (vb && vb.valid === false) {
        return NextResponse.json(
          { error: "invalid_billing_address" },
          { status: 422 }
        );
      }
      if (vb.normalized) Object.assign(billingAddress, vb.normalized);
    }
  } catch {}

  if (idempotencyKey) {
    const existing = await prisma.order.findFirst({
      where: {
        userId: uid,
        checkoutIdempotencyKey: idempotencyKey,
      } as Record<string, unknown>, // cast due to incremental type mismatch after recent migration
    });
    if (existing) {
      // Mirror shape of normal response (use stored discountCents snapshot)
      return NextResponse.json({
        orderId: existing.id,
        status: existing.status,
        subtotalCents: existing.subtotalCents,
        discountCents: existing.discountCents,
        taxCents: existing.taxCents,
        shippingCents: existing.shippingCents,
        totalCents: existing.totalCents,
        currency: existing.currency,
        idempotent: true,
      });
    }
  }

  // Discount code application
  let discountCents = 0;
  let discountMeta: {
    id?: string;
    code?: string;
    valueCents?: number;
    percent?: number;
  } = {};
  if (discountCode) {
    const now = new Date();
    const dc = await prisma.discountCode.findUnique({
      where: { code: discountCode.toUpperCase() },
    });
    if (dc && dc.startsAt && dc.startsAt > now) {
      debug("CHECKOUT", "discount_not_started");
      return NextResponse.json({ error: "invalid_discount" }, { status: 400 });
    }
    if (dc && dc.endsAt && dc.endsAt < now) {
      debug("CHECKOUT", "discount_expired");
      return NextResponse.json({ error: "invalid_discount" }, { status: 400 });
    }
    if (!dc) {
      debug("CHECKOUT", "invalid_discount", discountCode);
      return NextResponse.json({ error: "invalid_discount" }, { status: 400 });
    }
    if (dc.minSubtotalCents && subtotal < dc.minSubtotalCents) {
      debug("CHECKOUT", "discount_min_subtotal", {
        subtotal,
        required: dc.minSubtotalCents,
      });
      return NextResponse.json(
        { error: "discount_min_subtotal", required: dc.minSubtotalCents },
        { status: 400 }
      );
    }
    if (dc.usageLimit && dc.timesUsed >= dc.usageLimit) {
      debug("CHECKOUT", "discount_exhausted");
      return NextResponse.json(
        { error: "discount_exhausted" },
        { status: 400 }
      );
    }
    if (dc.kind === "FIXED" && dc.valueCents) {
      discountCents = Math.min(subtotal, dc.valueCents);
      discountMeta = { id: dc.id, code: dc.code, valueCents: dc.valueCents };
    } else if (dc.kind === "PERCENT" && dc.percent) {
      discountCents = Math.min(
        subtotal,
        Math.floor((subtotal * dc.percent) / 100)
      );
      discountMeta = { id: dc.id, code: dc.code, percent: dc.percent };
    }
  }

  // Dynamic tax & shipping
  const rateDraft = buildDraftFromCart({
    lines: cart.lines.map((l) => ({
      priceCentsSnapshot: l.priceCentsSnapshot,
      qty: l.qty,
      productId: l.productId,
    })),
    destination: {
      country: shippingAddress.country,
      region: shippingAddress.region || null,
      postalCode: shippingAddress.postalCode,
    },
    currency: selectedCurrency,
  });
  const rateResult = await calculateRates(rateDraft);
  // If the destination is tax-inclusive (e.g., GB), the product prices are
  // already inclusive of VAT. In that case, we should not add tax on top of
  // the subtotal. We still capture the included portion in taxCents for
  // transparency and reporting.
  const taxCents = rateResult.taxCents;
  const shippingCents = rateResult.shippingCents;
  const addTax = !(
    rateResult.breakdown && rateResult.breakdown.pricesIncludeTax
  );
  const totalCents =
    subtotal - discountCents + (addTax ? taxCents : 0) + shippingCents;

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const shipping = await tx.address.create({
        data: { ...shippingAddress, userId: uid },
      });
      let billing = shipping;
      if (billingAddress) {
        billing = await tx.address.create({
          data: { ...billingAddress, userId: uid },
        });
      }

      const order = await tx.order.create({
        data: {
          userId: uid,
          status: "AWAITING_PAYMENT",
          checkoutIdempotencyKey: idempotencyKey,
          subtotalCents: subtotal,
          discountCents,
          // Persist taxCents even when prices are tax-inclusive so summaries
          // can show the VAT portion. Totals already account for inclusion.
          taxCents,
          shippingCents,
          totalCents,
          currency: selectedCurrency,
          email:
            email ||
            (session?.user?.email as string) ||
            shippingAddress.fullName + "@example.local",
          shippingAddressId: shipping.id,
          billingAddressId: billing.id,
          discountCodeId: discountMeta.id,
          discountCodeCode: discountMeta.code,
          discountCodeValueCents: discountMeta.valueCents,
          discountCodePercent: discountMeta.percent,
        },
      });

      // Enhanced order events will be created after transaction

      for (const line of cart.lines) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: line.productId,
            sku: line.product.sku,
            nameSnapshot: line.product.name,
            size: line.size || null,
            qty: line.qty,
            unitPriceCents: line.priceCentsSnapshot,
            lineTotalCents: line.priceCentsSnapshot * line.qty,
            priceCentsSnapshot: line.priceCentsSnapshot,
            customKey:
              (line as any).customKey && String((line as any).customKey).length
                ? String((line as any).customKey)
                : null,
            customizations: (line as any).customizations
              ? typeof (line as any).customizations === "string"
                ? ((line as any).customizations as string)
                : JSON.stringify((line as any).customizations)
              : null,
          },
        });
        if (line.size) {
          const sizeVariant = line.product.sizeVariants.find(
            (s) => s.label === line.size
          );
          if (sizeVariant) {
            const ok = await decrementSizeStock(tx, sizeVariant.id, line.qty);
            if (!ok) throw new Error("STOCK_RACE_CONFLICT");
          }
        }
      }

      if (discountMeta.id) {
        // Concurrency guard: ensure we only increment if still under usageLimit (if defined)
        const dc = await tx.discountCode.findUnique({
          where: { id: discountMeta.id },
          select: { usageLimit: true, timesUsed: true },
        });
        if (dc) {
          if (dc.usageLimit && dc.timesUsed >= dc.usageLimit) {
            throw new Error("DISCOUNT_RACE_EXHAUSTED");
          }
          // Optimistic increment; a second concurrent transaction could still slip between read & write in SQLite.
          // (When migrating to Postgres we will switch to: UPDATE ... SET times_used = times_used + 1 WHERE id = $1 AND (usage_limit IS NULL OR times_used < usage_limit) RETURNING id)
          await tx.discountCode.update({
            where: { id: discountMeta.id },
            data: { timesUsed: { increment: 1 } },
          });
        }
      }

      // Create a pending payment record placeholder (simulated intent id for now)
      await tx.paymentRecord.create({
        data: {
          orderId: order.id,
          provider: "STRIPE",
          providerRef: `pi_sim_${order.id}`,
          amountCents: order.totalCents,
          currency: selectedCurrency,
          status: "PAYMENT_PENDING",
        },
      });
      return order;
    });
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e));
    if (error.message === "STOCK_RACE_CONFLICT") {
      debug("CHECKOUT", "stock_race_conflict");
      return NextResponse.json({ error: "stock_conflict" }, { status: 409 });
    }
    if (error.message === "DISCOUNT_RACE_EXHAUSTED") {
      debug("CHECKOUT", "discount_race_exhausted");
      return NextResponse.json(
        { error: "discount_exhausted" },
        { status: 400 }
      );
    }
    throw error;
  }

  // Create enhanced order events after transaction
  try {
    await OrderEventService.createEvent({
      orderId: result.id,
      kind: "ORDER_CREATED",
      message: "Order created and awaiting payment",
      userId: session?.user?.id,
      metadata: {
        subtotalCents: subtotal,
        discountCents,
        taxCents,
        shippingCents,
        totalCents,
        discountApplied: !!discountMeta.id,
        paymentProvider: "STRIPE",
      },
    });

    if (discountMeta.id) {
      await OrderEventService.createEvent({
        orderId: result.id,
        kind: "DISCOUNT_APPLIED",
        message: `Discount code ${discountMeta.code} applied`,
        userId: session?.user?.id,
        metadata: {
          discountCode: discountMeta.code,
          discountValueCents: discountMeta.valueCents,
          discountPercent: discountMeta.percent,
          totalDiscountCents: discountCents,
        },
      });
    }
  } catch (error) {
    logger.error("Failed to create enhanced order events:", error);
    // Don't fail the order creation for event logging issues
  }

  // Send rich order confirmation email (includes line items & addresses)
  if (session && session.user?.email && !testUser) {
    try {
      const userId = session.user.id;
      if (userId) {
        const [user, full] = await Promise.all([
          prisma.user.findUnique({ where: { id: userId } }),
          prisma.order.findUnique({
            where: { id: result.id },
            include: {
              items: {
                include: {
                  product: {
                    include: {
                      images: {
                        orderBy: { position: "asc" },
                      },
                    },
                  },
                },
              },
              shippingAddress: true,
              billingAddress: true,
            },
          }),
        ]);
        if (user && full) {
          await sendRichOrderConfirmation(user, {
            orderId: full.id,
            currency: full.currency,
            lines: full.items.map((i) => ({
              name: i.nameSnapshot,
              sku: i.sku,
              size: i.size,
              qty: i.qty,
              unitPriceCents: i.unitPriceCents,
              lineTotalCents: i.lineTotalCents,
              imageUrl: i.product?.images?.length
                ? i.product.images[0]?.url
                : null,
              customizations: (() => {
                if (!i.customizations) return undefined;
                try {
                  return JSON.parse(i.customizations) as JerseyCustomization;
                } catch {
                  return undefined;
                }
              })(),
            })),
            subtotalCents: full.subtotalCents,
            discountCents: full.discountCents,
            taxCents: full.taxCents,
            shippingCents: full.shippingCents,
            totalCents: full.totalCents,
            shipping: {
              fullName: full.shippingAddress!.fullName,
              line1: full.shippingAddress!.line1,
              line2: full.shippingAddress!.line2 || undefined,
              city: full.shippingAddress!.city,
              region: full.shippingAddress!.region || undefined,
              postalCode: full.shippingAddress!.postalCode,
              country: full.shippingAddress!.country,
              phone: full.shippingAddress!.phone || undefined,
            },
            billing: full.billingAddress
              ? {
                  fullName: full.billingAddress.fullName,
                  line1: full.billingAddress.line1,
                  line2: full.billingAddress.line2 || undefined,
                  city: full.billingAddress.city,
                  region: full.billingAddress.region || undefined,
                  postalCode: full.billingAddress.postalCode,
                  country: full.billingAddress.country,
                  phone: full.billingAddress.phone || undefined,
                }
              : undefined,
            estimatedDelivery: "3–5 business days",
          });
        } else if (user) {
          // Fallback to legacy minimal email if relation load failed
          await sendOrderConfirmation(user, result);
        }
      }
    } catch (error) {
      logError("order confirmation email failed", {
        error: error instanceof Error ? error.message : String(error),
        orderId: result.id,
      });
    }
  }
  // TODO: invoke payment intent creation (Stripe) here and update order.status => AWAITING_PAYMENT

  return NextResponse.json({
    orderId: result.id,
    status: result.status,
    subtotalCents: result.subtotalCents,
    discountCents,
    taxCents: result.taxCents,
    shippingCents: result.shippingCents,
    totalCents: result.totalCents,
    currency: result.currency,
  });
});
