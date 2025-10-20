## Unreleased

### Wallets: Apple Pay & Google Pay (October 17, 2025)

- Removed deprecated user-level MFA fields (mfaSecret, mfaBackupCodes); MFA data now stored exclusively in MfaDevice. Migration: `remove-user-mfa-fields`.

- Added Payment Request Button to checkout and cart pages
- Created Apple Pay domain association file scaffold under `public/.well-known/`
- Implemented Stripe PaymentIntent confirmation flow with wallet-backed payment methods
- Documentation: `docs/payments-wallets.md`, updated `README.md` and `DEPLOYMENT.md`

### Advanced Analytics Implementation (October 8, 2025)

#### Comprehensive Analytics System

- **Data Models**: Added 9 new Prisma models (UserSession, PageView, AnalyticsEvent, ConversionFunnel, CohortAnalysis, CustomerSegment, ProductAnalytics, CategoryAnalytics, SearchAnalytics, RevenueAnalytics)
- **Event Tracking**: Client-side analytics library with automatic page views, product interactions, search queries, and cart events
- **Dashboard UI**: Interactive admin analytics dashboard with charts, metrics, and multi-tab interface
- **API Endpoints**: RESTful analytics APIs for data collection (/api/analytics/events) and dashboard data (/api/analytics)
- **Background Processing**: Automated analytics processing via cron jobs (/api/analytics/process)

#### Analytics Features

- **User Analytics**: Session tracking, device/browser analytics, behavior patterns, customer segmentation
- **Product Analytics**: Performance metrics, conversion rates, revenue attribution, top performing products
- **Revenue Analytics**: Daily trends, order value analysis, customer lifetime value, revenue breakdowns
- **Conversion Analytics**: Funnel analysis, drop-off identification, page performance metrics
- **Search Analytics**: Query analysis, no-results tracking, search-to-purchase conversion
- **Real-time Tracking**: Live event collection with batched processing for performance

#### Technical Implementation

- **Client Library**: TypeScript analytics library with React hooks and automatic event detection
- **Database Schema**: Optimized indexes and relations for analytical queries
- **Performance**: Efficient batch processing, strategic caching, and optimized database queries
- **Privacy Compliance**: Anonymous tracking by default, GDPR-ready data handling
- **Comprehensive Documentation**: Full implementation guide in docs/ADVANCED_ANALYTICS.md

#### Impact

- Complete business intelligence and data-driven decision making capabilities
- Deep insights into user behavior, product performance, and conversion optimization
- Foundation for advanced features like personalization and predictive analytics
- Professional-grade analytics rivaling enterprise e-commerce platforms

### Production Email Service Configuration (October 8, 2025)

#### Email Service Production Setup

- **Resend Integration**: Confirmed production-ready Resend API configuration with live credentials
- **Professional Templates**: 5 branded email templates (verification, password reset, order confirmation, payment receipt)
- **Domain Configuration**: Email sending configured for nvrstl.com domain
- **Rich Order Emails**: Detailed order confirmations with line items, delivery addresses, and pricing breakdowns
- **Responsive Design**: Mobile-friendly HTML email templates with consistent NVRSTL branding
- **Production Documentation**: Created comprehensive EMAIL_PRODUCTION_SETUP.md guide

#### Technical Implementation

- **Provider Auto-Selection**: Resend API with graceful fallback to console logging
- **Environment Variables**: Production-ready EMAIL_FROM and RESEND_API_KEY configuration
- **Error Handling**: Comprehensive error logging and fallback mechanisms
- **Template Architecture**: Unified base layout with consistent styling and branding

#### Impact

- Email service fully production-ready for user communications
- Professional branded email experience for all user interactions
- Comprehensive deployment documentation for various hosting platforms
- Ready for immediate production deployment without additional email configuration

### Documentation Consistency Fix (October 8, 2025)

#### Documentation Updates

- **Seed Data Accuracy**: Updated README.md to reflect actual seeded data (111 products, 7 brands)
- **Seed Strategy Clarification**: Added table explaining basic vs comprehensive seed options
- **Architecture Alignment**: Updated ARCHITECTURE.md product counts to match current state
- **Historical Context**: Clarified that 210 products referenced expanded demo state from archive reports
- **TODO Tracking**: Added documentation consistency completion to project TODO list

#### Impact

- Eliminated confusion between documented vs actual database state
- Provided clear guidance on seed data options for developers
- Ensured documentation accurately represents current project state (October 2025)

### CI Pipeline Security & Stability Improvements (October 7, 2025)

#### Security Enhancements

- **Credential Masking**: All DATABASE_URL outputs now mask passwords in CI logs
- **Environment Variable Security**: Added `DB_MASKED` environment variable for consistent credential display
- **PostgreSQL Authentication**: Implemented proper `PGPASSWORD` environment variable usage
- **Jest Environment**: Enhanced setup to mask credentials in test output logs

#### CI/CD Improvements

- **Migration Strategy**: Removed dangerous `--force-reset --accept-data-loss` flags from Prisma commands
- **Database Connection**: Fixed PostgreSQL authentication issues with proper environment variables
- **Error Handling**: Added comprehensive validation and clear success/failure indicators
- **Performance**: Removed redundant caching steps, optimized pipeline execution
- **Testing**: Enhanced test environment setup with single-log pattern to reduce noise

#### Infrastructure

- **Build Process**: Added lint checks before tests to catch syntax errors early
- **Validation**: Enhanced environment variable validation and error reporting
- **Monitoring**: Improved CI step feedback with ✅/❌ status indicators

### Documentation Consolidation

- Split monolithic README into concise public `README.md` + deep-dive `ARCHITECTURE.md`.
- Archived 20+ historical phase/fix/status markdown files under `docs/archive/` for audit.
- Added badges placeholder (build/coverage) and clarified deferred feature activation path.
- No functional code changes; documentation restructure only.
- Root directory cleaned: legacy phase/report markdown files removed (duplicates now only referenced via `docs/archive/`).

### Added

- Rich order confirmation email (line items, pricing breakdown, shipping & billing addresses, estimated delivery) sent on checkout creation instead of minimal summary.

### Admin Product Management Enhancements (Phase 2)

- Added soft delete (products now have `deletedAt`); admin list can optionally show deleted items with a toggle and visual badge.
- Implemented product restore endpoint & UI (Restore button on deleted product edit page).
- Added brand & category filters plus deleted toggle to `/admin/products` listing.
- Enhanced admin search API & UI to respect brand, category, and deleted filters.
- Implemented drag-and-drop image reordering in edit form with debounced auto-save.
- Added inline SKU availability check (debounced) and badge feedback while editing products.
- Enforced unique size labels client-side and server-side (duplicate size labels rejected with `duplicate_sizes` error).
- Added visual indicators for deleted state in list and edit views.

Migration / Notes:

- No schema change required beyond previously introduced `deletedAt` on Product.
- Existing integrations unaffected; soft-deleted products are excluded by default from admin list & search unless `deleted=1` query param provided.
- Auto-save of image order uses debounced PUT; manual Save still performs full update.

### Pricing Model Migration

- Removed legacy float `price` fields from all product/search API responses.
- Introduced and enforced integer cent values via `priceCents` & `priceCentsSnapshot`.
- Added `formatPriceCents(cents)` helper for display formatting; discouraged direct `toFixed(2)` usage.
- Updated cart, wishlist, search suggestions, category and product pages to rely exclusively on `priceCents`.
- Added ESLint restriction preventing accidental `toFixed(2)` formatting on price-like identifiers.

No external breaking changes unless a consumer relied on the removed `price` float property. Such clients must now derive display from `priceCents / 100` or call the formatter.
