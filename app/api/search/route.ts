import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

// Type definitions for search functionality
interface SearchBreakdown {
  nameCount: number;
  descCount: number;
  brandCount: number;
  catCount: number;
  skuCount: number;
  expandedTerms: string[];
}

interface ProductQueryRow {
  id: string;
  name: string;
  priceCents: number;
  createdAt: Date;
}

// Use Prisma result type for actual database results
type ProductWithIncludes = Awaited<
  ReturnType<typeof prisma.product.findMany>
>[0];

interface ScoredProduct {
  p: ProductWithIncludes;
  d: number;
  score: number;
}

// One-time diagnostic logging guard (helps confirm DB file / env in dev)
let diagLogged = false;
const BUILD_SIGNATURE = "search-v3.1"; // bump when changing search logic

const HALF_LIFE_HOURS = 72; // for trending sort scoring

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const category = searchParams.get("category") || undefined; // category slug
  const brand = searchParams.get("brand") || undefined; // brand id
  const size = searchParams.get("size") || undefined;
  const gender = searchParams.get("gender") || undefined; // men | women | unisex
  const min = parseFloat(searchParams.get("min") || "0");
  const max = parseFloat(searchParams.get("max") || "100000000");
  const sort = (searchParams.get("sort") || "newest").toLowerCase();
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
  const limit = Math.min(
    parseInt(searchParams.get("limit") || "30", 10) || 30,
    60
  );
  const includeFacets = searchParams.get("facets") === "1";
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    deletedAt: null,
    priceCents: { gte: Math.round(min * 100), lte: Math.round(max * 100) },
  };
  if (category) where.category = { slug: category };
  if (brand) where.brandId = brand;
  if (size) where.sizes = { some: { label: size } };
  if (gender) where.gender = { in: [gender, "unisex"] };
  let expandedTerms: string[] = [];
  if (q) {
    const raw = q.toLowerCase();
    const synonymMap: Record<string, string[]> = {
      hat: ["cap", "beanie", "bucket", "snapback"],
      caps: ["hat", "beanie", "snapback"],
      shoe: ["sneaker", "trainer", "footwear"],
      shoes: ["sneaker", "trainer", "footwear"],
      sneaker: ["shoe", "trainer"],
      sneakers: ["shoes", "trainers"],
      trainer: ["shoe", "sneaker"],
      trainers: ["shoes", "sneakers"],
      jean: ["denim"],
      jeans: ["denim"],
      jacket: ["coat", "outerwear"],
      jackets: ["coat", "outerwear"],
      coat: ["jacket", "outerwear"],
      bag: ["tote", "backpack"],
      bags: ["tote", "backpacks"],
      dress: ["gown"],
      dresses: ["gown"],
      top: ["shirt", "tee", "t-shirt"],
      shirt: ["top", "tee", "t-shirt"],
      shirts: ["top", "tees", "t-shirts"],
      tee: ["t-shirt", "shirt", "top"],
      tees: ["t-shirts", "shirts"],
      "t-shirt": ["tee", "shirt", "top"],
      hoodie: ["sweatshirt"],
      hoodies: ["sweatshirt", "sweatshirts"],
    };
    const tokens = raw.split(/\s+/).filter(Boolean).slice(0, 6);
    const termSet = new Set<string>();
    termSet.add(raw);
    for (const t of tokens) {
      termSet.add(t);
      if (t.length > 2) {
        if (t.endsWith("s")) termSet.add(t.slice(0, -1));
        else termSet.add(t + "s");
      }
      const base = t.endsWith("s") ? t.slice(0, -1) : t;
      const syns = synonymMap[t] || synonymMap[base];
      if (syns) syns.forEach((s) => termSet.add(s));
    }
    expandedTerms = Array.from(termSet).filter(Boolean).slice(0, 12);
    const or: Array<Record<string, unknown>> = [];
    const pushTerm = (term: string) => {
      or.push({ name: { contains: term } });
      or.push({ description: { contains: term } });
      or.push({ brand: { name: { contains: term } } });
      or.push({ category: { name: { contains: term } } });
      or.push({ sku: { contains: term } });
    };
    expandedTerms.forEach(pushTerm);
    where.OR = or;
  }

  // For non-trending/non-relevance sorts we can use orderBy directly
  let orderBy: Record<string, "asc" | "desc"> | undefined = undefined;
  switch (sort) {
    case "price_asc":
      orderBy = { priceCents: "asc" };
      break;
    case "price_desc":
      orderBy = { priceCents: "desc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
    case "trending":
      // handled manually after fetch
      break;
    case "relevance":
      // handled manually after fetch (needs q); fallback to newest if no q
      if (!q) orderBy = { createdAt: "desc" };
      break;
    default:
      orderBy = { createdAt: "desc" };
  }

  // Always fetch a bit more when trending or relevance so we can score then slice
  const overFetchMultiplier =
    sort === "trending" || sort === "relevance" ? 2 : 1;
  const take = Math.min(limit * overFetchMultiplier, 100);

  // totalCount for pagination (without skip/limit)
  const totalCount = await prisma.product.count({ where });

  let products = await prisma.product.findMany({
    where,
    skip: sort === "trending" || sort === "relevance" ? 0 : skip, // fetch from start for scoring sorts
    take,
    orderBy: orderBy || { createdAt: "desc" },
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      ...(sort === "trending" ? { metrics: true } : {}),
    },
  });

  // If nothing found and we had a query, try a broader fallback (token OR search) for resilience / debug.
  if (products.length === 0 && q) {
    const tokens = q.split(/\s+/).filter(Boolean).slice(0, 5);
    if (tokens.length > 1) {
      const broadWhere = { ...where };
      broadWhere.OR = tokens.map((t) => ({
        name: { contains: t },
      }));
      try {
        products = await prisma.product.findMany({
          where: broadWhere,
          take,
          orderBy: orderBy || { createdAt: "desc" },
          include: {
            images: { orderBy: { position: "asc" }, take: 1 },
            ...(sort === "trending" ? { metrics: true } : {}),
          },
        });
      } catch (error) {
        logger.error("Search API error:", error);
      }
    }
    // Final relaxed retry ignoring price bounds if still nothing
    if (products.length === 0) {
      try {
        const relaxedWhere = { ...where };
        delete relaxedWhere.priceCents;
        products = await prisma.product.findMany({
          where: relaxedWhere,
          take,
          orderBy: orderBy || { createdAt: "desc" },
          include: {
            images: { orderBy: { position: "asc" }, take: 1 },
            ...(sort === "trending" ? { metrics: true } : {}),
          },
        });
      } catch (error) {
        logger.error("Search API error:", error);
      }
    }
    // Raw SQL fallback (defensive): if still nothing, attempt manual LIKE across name/description
    if (products.length === 0) {
      try {
        const mainTerm = q.toLowerCase();
        // Build dynamic OR for expandedTerms or fallback to q
        const terms = expandedTerms.length
          ? expandedTerms.slice(0, 8)
          : [mainTerm];
        // Escape single quotes to avoid SQL injection (terms derived from user input tokens)
        const esc = (s: string) => s.replace(/'/g, "''");
        const likeClauses = terms
          .map((t) => {
            const pat = `%${esc(t.toLowerCase())}%`;
            return `(lower(p.name) LIKE '${pat}' OR lower(p.description) LIKE '${pat}')`;
          })
          .join(" OR ");
        const priceMin = Math.round(min * 100);
        const priceMax = Math.round(max * 100);
        const sql = `SELECT p.id, p.name, p.priceCents, p.createdAt
             FROM Product p
             WHERE p.deletedAt IS NULL
               AND p.priceCents BETWEEN ${priceMin} AND ${priceMax}
               AND (${likeClauses})
             ORDER BY p.createdAt DESC
             LIMIT ${take}`;
        const rows = await prisma.$queryRawUnsafe<ProductQueryRow[]>(sql);
        if (rows.length) {
          // Fetch with images for consistency
          const ids = rows.map((r) => r.id);
          const fetched = await prisma.product.findMany({
            where: { id: { in: ids } },
            include: {
              images: { orderBy: { position: "asc" }, take: 1 },
              ...(sort === "trending" ? { metrics: true } : {}),
            },
          });
          products = fetched;
          // eslint-disable-next-line no-console
          logger.info("[search:raw-fallback-hit]", {
            q,
            terms,
            count: products.length,
          });
        }
      } catch (error) {
        logger.error("Error:", error);
        // eslint-disable-next-line no-console
        logger.error("[search:raw-fallback-error]", (error as Error).message);
      }
    }
    // Fuzzy fallback (very small in-memory pass) if still zero
    if (products.length === 0 && q.length >= 3) {
      try {
        // Pull a capped candidate pool (newest 300) to score with simple edit-distance and token inclusion
        const candidatePool = await prisma.product.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 300,
          include: { images: { orderBy: { position: "asc" }, take: 1 } },
        });
        const target = q.toLowerCase();
        const maxDistance = target.length <= 5 ? 1 : target.length <= 8 ? 2 : 3;
        const distance = (a: string, b: string) => {
          if (a === b) return 0;
          // Bounded Wagner-Fischer with early exit if row minimum > maxDistance
          const m = a.length;
          const n = b.length;
          if (Math.abs(m - n) > maxDistance) return maxDistance + 1;
          const prev = new Array(n + 1).fill(0);
          const curr = new Array(n + 1).fill(0);
          for (let j = 0; j <= n; j++) prev[j] = j;
          for (let i = 1; i <= m; i++) {
            curr[0] = i;
            let rowMin = curr[0];
            const ca = a.charCodeAt(i - 1);
            for (let j = 1; j <= n; j++) {
              const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
              curr[j] = Math.min(
                prev[j] + 1,
                curr[j - 1] + 1,
                prev[j - 1] + cost
              );
              if (curr[j] < rowMin) rowMin = curr[j];
            }
            if (rowMin > maxDistance) return maxDistance + 1; // prune
            for (let j = 0; j <= n; j++) prev[j] = curr[j];
          }
          return curr[n];
        };
        const scored = candidatePool
          .map((p) => {
            const nameLower = p.name.toLowerCase();
            const d = distance(target, nameLower.slice(0, 60));
            if (d > maxDistance && !nameLower.includes(target)) return null;
            const tokenHit = nameLower.includes(target) ? 1 : 0;
            const score =
              -d +
              tokenHit * 2 +
              (p.createdAt ? Date.now() - new Date(p.createdAt).getTime() : 0) *
                -1e-12;
            return { p, d, score };
          })
          .filter(Boolean) as ScoredProduct[];
        scored.sort((a, b) => b.score - a.score);
        const top = scored.slice(0, limit);
        if (top.length) {
          products = top.map((t) => t.p) as typeof products;
          // eslint-disable-next-line no-console
          logger.info("[search:fuzzy-fallback-hit]", {
            q,
            count: products.length,
            maxDistance,
          });
        }
      } catch (error) {
        logger.error("Error:", error);
        // eslint-disable-next-line no-console
        logger.error("[search:fuzzy-fallback-error]", (error as Error).message);
      }
    }
  }

  let scored = products;
  if (sort === "trending") {
    const now = Date.now();
    scored = [...products].map((p) => {
      const m = (
        p as ProductWithIncludes & {
          metrics?: {
            views: number;
            detailViews: number;
            wishlists: number;
            addToCart: number;
            purchases: number;
          };
        }
      ).metrics || {
        views: 0,
        detailViews: 0,
        wishlists: 0,
        addToCart: 0,
        purchases: 0,
      };
      const ageHours = (now - new Date(p.createdAt).getTime()) / 3600000;
      const weighted =
        0.5 * (m.views || 0) +
        1.0 * (m.detailViews || 0) +
        1.3 * (m.wishlists || 0) +
        2.2 * (m.addToCart || 0) +
        4.0 * (m.purchases || 0);
      const decay = 1 / (1 + ageHours / HALF_LIFE_HOURS);
      const score = weighted * decay;
      return Object.assign({}, p, { score });
    });
    scored.sort(
      (a, b) =>
        ((b as { score?: number }).score || 0) -
        ((a as { score?: number }).score || 0)
    );
  }

  if (sort === "relevance" && q) {
    // Basic relevance scoring tiers
    const rawLower = q.toLowerCase();
    const tokens = rawLower.split(/\s+/).filter(Boolean);
    // Build synonym baseline (reuse expandedTerms already built)
    const termSet = new Set(expandedTerms);
    const originalSet = new Set(tokens);
    scored = products.map((p) => {
      let score = 0;
      const nameLower = p.name.toLowerCase();
      const descLower = (p.description || "").toLowerCase();
      // Exact phrase matches
      if (nameLower.includes(rawLower)) score += 120;
      if (descLower.includes(rawLower)) score += 40;
      // Token level
      for (const t of termSet) {
        const isOriginal = originalSet.has(t);
        const weightName = isOriginal ? 30 : 12;
        const weightDesc = isOriginal ? 12 : 5;
        if (nameLower.includes(t)) score += weightName;
        if (descLower.includes(t)) score += weightDesc;
      }
      // Mild recency boost (newer products up to +15)
      const ageHours = (Date.now() - new Date(p.createdAt).getTime()) / 3600000;
      const recency = Math.max(0, 1 - ageHours / (24 * 14)); // fade over 14 days
      score += recency * 15;
      return { ...p, score };
    });
    scored.sort(
      (a, b) =>
        ((b as { score?: number }).score || 0) -
        ((a as { score?: number }).score || 0)
    );
  }

  // Apply pagination slice AFTER scoring for relevance/trending; otherwise slice occurred via skip
  let trimmed: typeof products;
  if (sort === "trending" || (sort === "relevance" && q)) {
    trimmed = scored.slice(skip, skip + limit);
  } else {
    trimmed = scored;
  }
  const items = trimmed.map((p) => ({
    id: p.id,
    name: p.name,
    priceCents: p.priceCents,
    price: p.priceCents / 100,
    image: p.images[0]?.url || "/placeholder.svg",
    score: (p as { score?: number }).score,
  }));

  if (q && items.length === 0) {
    // Dev instrumentation only; remove or guard behind env flag for production
    // eslint-disable-next-line no-console
    logger.info("[search:zero-results]", {
      q,
      expandedTerms,
      where,
      min,
      max,
      brand,
      category,
      size,
      sort,
    });
  }

  const debugMode = searchParams.get("debug");
  const debugRequested = debugMode === "1" || debugMode === "2";
  let breakdown: SearchBreakdown | undefined = undefined;
  if (debugMode === "2" && q) {
    const query = q.toLowerCase();
    const base: Record<string, unknown> = { deletedAt: null };
    const [nameCount, descCount, brandCount, catCount, skuCount] =
      await Promise.all([
        prisma.product.count({
          where: { ...base, name: { contains: query } },
        }),
        prisma.product.count({
          where: {
            ...base,
            description: { contains: query },
          },
        }),
        prisma.product.count({
          where: {
            ...base,
            brand: { name: { contains: query } },
          },
        }),
        prisma.product.count({
          where: {
            ...base,
            category: { name: { contains: query } },
          },
        }),
        prisma.product.count({
          where: { ...base, sku: { contains: query } },
        }),
      ]);
    breakdown = {
      nameCount,
      descCount,
      brandCount,
      catCount,
      skuCount,
      expandedTerms,
    };
  }
  // Extended diagnostics (debug=3): per-term match counts & dataset info
  let termMatches:
    | Array<{ term: string; nameCount: number; descCount: number }>
    | undefined;
  let dataset: { totalProducts: number } | undefined;
  let debugError: string | undefined;
  if (debugMode === "3" && q) {
    try {
      // Ensure expandedTerms is populated even if breakdown path not executed
      const termsForDiag = expandedTerms.length
        ? expandedTerms
        : [q.toLowerCase()];
      termMatches = await Promise.all(
        termsForDiag.map(async (term) => {
          const base = { deletedAt: null };
          const [nameCount, descCount] = await Promise.all([
            prisma.product.count({
              where: { ...base, name: { contains: term } },
            }),
            prisma.product.count({
              where: {
                ...base,
                description: { contains: term },
              },
            }),
          ]);
          return { term, nameCount, descCount };
        })
      );
      const totalProducts = await prisma.product.count({
        where: { deletedAt: null },
      });
      dataset = { totalProducts };
    } catch (e: unknown) {
      debugError = e instanceof Error ? e.message : String(e);
    }
  }

  if (!diagLogged) {
    // eslint-disable-next-line no-console
    logger.info("[search:env] DATABASE_URL", {
      databaseUrl: process.env.DATABASE_URL,
    });
    diagLogged = true;
  }
  if (!includeFacets) {
    return NextResponse.json({
      items,
      total: items.length,
      totalCount,
      page,
      pageSize: limit,
      ...(debugRequested
        ? {
            debug: {
              where,
              sort,
              q,
              limit,
              originalCount: products.length,
              breakdown,
              termMatches,
              dataset,
              debugError,
              sig: BUILD_SIGNATURE,
            },
          }
        : {}),
      sig: BUILD_SIGNATURE,
    });
  }

  // Facets: categories, brands, price range (global under current q filters except brand/category isolation complexity)
  // Scoped facet counts: counts reflect current filters except the dimension itself.
  const baseFilter = { ...where };
  delete baseFilter.category; // we will vary this
  delete baseFilter.brandId;

  const [allCategories, allBrands, priceAgg] = await Promise.all([
    prisma.category.findMany({ select: { id: true, slug: true, name: true } }),
    prisma.brand.findMany({ select: { id: true, name: true } }),
    prisma.product.aggregate({
      _min: { priceCents: true },
      _max: { priceCents: true },
    }),
  ]);

  // Count per category under current (non-category) constraints
  const categoryCounts = await Promise.all(
    allCategories.map(async (c) => {
      const count = await prisma.product.count({
        where: { ...baseFilter, category: { slug: c.slug } },
      });
      return { id: c.id, slug: c.slug, name: c.name, count };
    })
  );
  // Count per brand under current (non-brand) constraints
  const brandCounts = await Promise.all(
    allBrands.map(async (b) => {
      const count = await prisma.product.count({
        where: { ...baseFilter, brandId: b.id },
      });
      return { id: b.id, name: b.name, count };
    })
  );

  return NextResponse.json({
    items,
    total: items.length,
    facets: {
      categories: categoryCounts,
      brands: brandCounts,
      priceRange: {
        min: (priceAgg._min.priceCents || 0) / 100,
        max: (priceAgg._max.priceCents || 0) / 100,
      },
    },
    ...(debugRequested
      ? {
          debug: {
            where,
            sort,
            q,
            limit,
            originalCount: products.length,
            breakdown,
            termMatches,
            dataset,
            debugError,
            sig: BUILD_SIGNATURE,
          },
        }
      : {}),
    sig: BUILD_SIGNATURE,
    totalCount,
    page,
    pageSize: limit,
  });
}
