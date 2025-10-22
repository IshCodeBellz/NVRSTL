<!--
  ARCHITECTURE.md
  Full internal / technical documentation consolidated previously in README.
  Public-facing README is now a concise overview. This file is the authoritative
  deep-dive for contributors. Keep sections numbered for stable anchors.
-->

<!-- NOTE: Content copied from prior consolidated README before split -->

# NVRSTL (Architecture & Internal Documentation)

Educational fashion e‑commerce demo (formerly "ASOS Clone", now "NVRSTL") showcasing modern commerce patterns: App Router, server + client composition, search relevance, analytics events, and a full checkout → payment → webhook lifecycle.

> This file supersedes scattered historical \*.md reports. Historical originals are preserved in `docs/archive/` for audit.

## 1. Executive Snapshot

| Area                              | Status                      | Notes                                                                                               |
| --------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------- |
| Core Commerce (browse → checkout) | ✅ Production-ready         | 111+ products, variants, discounts, order flow verified (expandable to 210+)                        |
| Admin Suite                       | ✅ 100% coverage            | Products, orders, brands, categories, discounts, inventory, social, analytics, performance          |
| Performance Optimization          | ✅ Production-ready         | Database optimization, Redis caching, connection pooling, monitoring dashboards                     |
| Production Deployment             | ✅ Production-ready         | Docker, zero-downtime deployment, environment validation, health checks                             |
| Search & Trending                 | ✅ Implemented              | Weighted relevance + time-decay trending, synonyms, facets                                          |
| Events & Metrics                  | ✅ Active                   | VIEW / DETAIL / WISHLIST / ATC / PURCHASE instrumentation feeding ProductMetrics                    |
| Payments                          | ✅ Simulated + Stripe-ready | Idempotent checkout, webhook finalization, future real keys drop-in                                 |
| Social Commerce                   | ✅ Foundation               | Wishlist (public/private), review moderation scaffolding, analytics stubs                           |
| Personalization                   | ✅ Baseline                 | Recently viewed, trending, relationships seed (future ML hooks)                                     |
| Observability                     | ✅ Production-grade         | Health endpoints, performance metrics, monitoring dashboards, Sentry integration                    |
| Deployment Infrastructure         | ✅ Enterprise-ready         | Complete CI/CD, Docker orchestration, environment management, automated deployment                  |
| Deferred Advanced Features        | 🚧 Stubbed                  | Variants mgmt enhancements, bundles, review create/vote/report, product relations, inventory alerts |

## 2. Feature Overview

### 2.1 User & Storefront

- Responsive Next.js 14 (RSC) UI with Tailwind
- Home: Hero, Trending Now (time-decay score), Drops, Recently Viewed
- Category & search pages: client filters (size, price), relevance sorting, plural & synonym expansion
- Product Detail: multi-image gallery, structured data JSON-LD, size variant enforcement, wishlist toggle
- Cart & Wishlist: local-first → sync strategy, optimistic updates, enforced size selection
- Checkout: validation (stock, deleted, size), discount codes, idempotent order creation
- Payment: simulated flow + webhook mimic; Stripe endpoints ready for live keys

### 2.2 Admin & Operations

- Dashboard KPIs with real-time analytics
- Products / Brands / Categories CRUD (soft-delete + SKU uniqueness)
- Orders status transitions + event log (OrderEvent)
- Discount validation engine
- Inventory alerts & movement summaries
- Performance monitoring dashboard with database optimization
- Social moderation queue (stubs for create/vote/report)
- Security groundwork (rate limiting scaffold, MFA schema)
- Production deployment management and health monitoring

### 2.3 Data & Intelligence

- ProductMetrics counters (views, detailViews, wishlists, addToCart, purchases)
- Trending score = Σ(weighted interactions) × decay(Δhours, halfLife=72)
- Search facets & analytics (term frequency, trending queries foundation)
- Review & Wishlist analytics baseline

### 2.4 Engineering Foundations

- Strict TypeScript, Prisma schema (SQLite dev / Postgres production-ready)
- Event batching ingestion API
- Comprehensive health endpoints & environment validation
- Performance optimization tools (database analysis, Redis caching, connection pooling)
- Production deployment automation (Docker, zero-downtime deployment)
- Integration + unit tests (search expansion, trending decay, checkout)
- Production monitoring and alerting systems

## 3. Data Model Highlights

Key Prisma models: Product, ProductVariant, SizeVariant, ProductImage, ProductMetrics, Wishlist(+Items +Followers +Analytics), ProductReview, Order / OrderItem / PaymentRecord, DiscountCode, InventoryAlert, ProductRelation, UserBehavior, Recommendation, ReviewAnalytics.

Deferred service layers: bundles, advanced variant mgmt, review create/vote/report, relations scoring, inventory alert automation.

## 4. Algorithms & Scoring

Trending weights: views 0.5, detail 1.0, wishlist 1.3, addToCart 2.2, purchases 4.0; multiplied by time decay (72h half-life logistic). Fallback: newest products if insufficient signal.
Search relevance: basic normalization + synonym/plural expansion + field weighting (name, brand, category, tags).

## 5. Social & Engagement

Implemented: wishlists (public/private), moderation query scaffolds.
Stubbed: review create/vote/report & analytics enrichment, helpfulness scoring, escalation queue.

## 6. Testing & Quality

Automated tests cover checkout flow, search expansion, trending decay math, pricing formatting, order status transitions. Manual journey validated end-to-end.

## 7. Deployment & Operations

Environment variables (see `.env.example`). Use Postgres before scale. Add Stripe live keys + webhook signing for production. Optional: Redis for caching personalization/search.

## 8. Deferred / Stubbed Feature Activation Plan

| Feature                   | Stub Location                | Unlock Steps                                           |
| ------------------------- | ---------------------------- | ------------------------------------------------------ |
| Review create/vote/report | `ReviewService` static stubs | Implement CRUD + vote model + analytics updates        |
| Variant management 2.0    | `ProductManagementService`   | Replace stubs; admin variant/bundle UI                 |
| Bundles & collections     | Same                         | Link model + pricing + PDP surface                     |
| Inventory alerts engine   | Same                         | On-write checks + scheduled sweeps + alert surfaces    |
| Product relations scoring | Same                         | Generate similarity graph (views, co-purchase) + cache |
| Bulk product tools        | Same                         | CLI ingest + validation + dedupe                       |

Suggested order: Reviews → Variants → Relations → Inventory Alerts → Bundles → Bulk Tools.

## 9. Security Snapshot

Idempotent checkout, session via NextAuth, planned MFA, env validation logging, rate limit scaffold. Future: CSP, CSRF, token rotation, anomaly scoring.

## 10. Contribution Guidelines

1. Schema change: migrate + document rationale.
2. New service: define interface + error modes + minimal tests.
3. Currency: only integer minor units (`priceCents`).
4. Replace stubs atomically; remove "Disabled" responses and add tests.

## 11. Quick Dev Workflow

```
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
npm test
```

## 12. Known Technical Debt

- Stubs as above
- No persistent cache layer yet
- Simulated Stripe if keys absent

## 13. Glossary

| Term            | Meaning                                               |
| --------------- | ----------------------------------------------------- |
| RSC             | React Server Components                               |
| ATC             | Add To Cart                                           |
| Decay           | Time-weighting for recency                            |
| Idempotency Key | Unique key preventing duplicate checkout side effects |

## 14. Status Summary

Core production-quality; advanced social / bundles deferred; ready for payment enablement & personalization expansion.

---

Historical detailed phase / fix / audit documents: now under `docs/archive/`.
