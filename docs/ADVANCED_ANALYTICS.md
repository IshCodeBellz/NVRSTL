# Advanced Analytics Implementation

This document outlines the comprehensive analytics system implemented for DY Official, providing detailed insights into user behavior, product performance, and business metrics.

## Overview

The analytics system consists of multiple components working together to collect, process, and visualize business data:

1. **Data Models** - Comprehensive Prisma schema models for analytics data
2. **Event Tracking** - Client-side and server-side event collection
3. **Processing Services** - Background jobs for data aggregation and analysis
4. **API Endpoints** - RESTful APIs for analytics data access
5. **Dashboard UI** - Interactive analytics dashboard with visualizations

## Data Models

### Core Analytics Models

#### UserSession

Tracks user session data including device, browser, and session duration.

```typescript
model UserSession {
  id            String    @id @default(cuid())
  userId        String?
  sessionId     String    @unique
  startTime     DateTime
  endTime       DateTime?
  duration      Int?      // in seconds
  device        String?   // mobile, desktop, tablet
  browser       String?   // chrome, safari, firefox, etc.
  os            String?   // windows, macos, ios, android
  ipAddress     String?
  country       String?
  city          String?
}
```

#### PageView

Records page views with timing and referrer information.

```typescript
model PageView {
  id            String    @id @default(cuid())
  userId        String?
  sessionId     String?
  path          String
  title         String?
  referrer      String?
  timeOnPage    Int?      // in seconds
  timestamp     DateTime  @default(now())
  ipAddress     String?
  userAgent     String?
}
```

#### AnalyticsEvent

Comprehensive event tracking for all user interactions.

```typescript
model AnalyticsEvent {
  id               String      @id @default(cuid())
  sessionId        String
  userId           String?
  eventType        String      // click, scroll, form_submit, purchase, etc.
  eventCategory    String      // engagement, ecommerce, navigation
  eventAction      String      // add_to_cart, remove_from_cart, checkout_start
  eventLabel       String?     // specific product, button name, etc.
  eventValue       Float?      // monetary value or numeric value
  productId        String?     // for product-related events
  categoryId       String?     // for category-related events
  metadata         String?     // JSON string for additional data
  timestamp        DateTime    @default(now())
}
```

#### ConversionFunnel

Tracks conversion funnels and step-by-step user journeys.

```typescript
model ConversionFunnel {
  id               String    @id @default(cuid())
  name             String    // e.g., "Checkout Funnel", "Product Discovery"
  steps            String    // JSON array of step definitions
  dateRange        String    // JSON object with start/end dates
  totalUsers       Int       @default(0)
  completedUsers   Int       @default(0)
  conversionRate   Float     @default(0)
  dropoffData      String    // JSON object with step-by-step dropoff rates
}
```

#### ProductAnalytics

Advanced product performance metrics.

```typescript
model ProductAnalytics {
  id               String    @id @default(cuid())
  productId        String    @unique
  impressions      Int       @default(0)  // times shown to users
  clicks           Int       @default(0)  // times clicked/viewed
  conversionRate   Float     @default(0)  // percentage who purchased after viewing
  revenue          Int       @default(0)  // total revenue in cents
  profit           Int?      // profit in cents (if cost data available)
  averageRating    Float?    // average customer rating
  reviewCount      Int       @default(0)
  returnRate       Float     @default(0)  // percentage of returns
  wishlistCount    Int       @default(0)  // times added to wishlist
}
```

#### CategoryAnalytics

Category-level performance metrics.

```typescript
model CategoryAnalytics {
  id                  String    @id @default(cuid())
  categoryId          String    @unique
  totalRevenue        Int       @default(0)    // in cents
  productViews        Int       @default(0)
  conversionRate      Float     @default(0)
  averageOrderValue   Int       @default(0)    // in cents
  topProducts         String?   // JSON array of top performing product IDs
  seasonalityIndex    Float     @default(1.0)  // seasonal performance multiplier
  trendScore          Float     @default(0)
}
```

#### SearchAnalytics

Search behavior and query performance.

```typescript
model SearchAnalytics {
  id                      String    @id @default(cuid())
  date                    DateTime  @unique
  totalSearches           Int       @default(0)
  uniqueQueries           Int       @default(0)
  noResultsRate          Float     @default(0)    // percentage with no results
  clickThroughRate       Float     @default(0)    // percentage who clicked results
  averageResultsPerQuery Int       @default(0)
  topQueries             String?   // JSON array of popular queries
  trendingQueries        String?   // JSON array of trending queries
}
```

#### RevenueAnalytics

Daily revenue breakdown and customer segmentation.

```typescript
model RevenueAnalytics {
  id                        String    @id @default(cuid())
  date                      DateTime  @unique
  totalRevenue             Int       @default(0)  // in cents
  orderCount               Int       @default(0)
  averageOrderValue        Int       @default(0)  // in cents
  newCustomerRevenue       Int       @default(0)  // in cents
  returningCustomerRevenue Int       @default(0)  // in cents
  refundAmount             Int       @default(0)  // in cents
  discountAmount           Int       @default(0)  // in cents
}
```

#### CohortAnalysis

Customer retention and lifetime value analysis.

```typescript
model CohortAnalysis {
  id               String    @id @default(cuid())
  cohortMonth      DateTime  @unique
  cohortSize       Int       // number of users in cohort
  retentionRates   Float[]   // retention rates by month [Month1, Month2, ...]
  revenueData      Float[]   // revenue per user by month
}
```

#### CustomerSegment

Dynamic customer segmentation.

```typescript
model CustomerSegment {
  id               String    @id @default(cuid())
  name             String
  description      String?
  criteria         String    // JSON object defining segment criteria
  userCount        Int       @default(0)
  averageOrderValue Int      @default(0) // in cents
  totalRevenue     Int       @default(0) // in cents
  conversionRate   Float     @default(0)
  users            User[]    @relation("UserSegments")
}
```

## Event Tracking

### Client-Side Analytics

The client-side analytics library automatically tracks user interactions:

```typescript
import { useAnalytics } from "@/lib/client/analytics";

// In React components
const { track, trackPageView, trackProductView } = useAnalytics(userId);

// Track custom events
track("NEWSLETTER_SIGNUP", { source: "header" });

// Track product interactions
trackProductView(productId, productName, categoryId);

// Track search queries
trackSearch(query, resultCount, filters);
```

### Automatic Event Collection

The system automatically collects:

- Page views and navigation
- Session start/end events
- Product views and interactions
- Cart modifications
- Checkout steps
- Search queries
- Form submissions

### Event Types

| Event Type         | Description               | Properties                                |
| ------------------ | ------------------------- | ----------------------------------------- |
| `PAGE_VIEW`        | User views a page         | `path`, `title`, `referrer`, `timeOnPage` |
| `PRODUCT_VIEW`     | User views a product      | `productId`, `productName`, `categoryId`  |
| `SEARCH`           | User performs a search    | `query`, `resultCount`, `filters`         |
| `ADD_TO_CART`      | Product added to cart     | `productId`, `quantity`, `price`          |
| `REMOVE_FROM_CART` | Product removed from cart | `productId`, `quantity`                   |
| `CHECKOUT_START`   | User starts checkout      | `cartValue`, `itemCount`                  |
| `PURCHASE`         | Successful purchase       | `orderId`, `revenue`, `items`             |
| `SIGNUP`           | User creates account      | `method`, `source`                        |
| `LOGIN`            | User logs in              | `method`                                  |

## API Endpoints

### Analytics Data API

#### GET /api/analytics

Comprehensive analytics dashboard data.

**Query Parameters:**

- `period`: `7d`, `30d`, `90d`, `1y` (default: `30d`)
- `realtime`: `true`/`false` - include real-time data

**Response:**

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "period": "30d",
  "analytics": {
    "user": {
      "newUsers": 1250,
      "sessions": {
        "byDevice": {"Desktop": 60, "Mobile": 35, "Tablet": 5},
        "averageDuration": 185
      },
      "behavior": {
        "byEventType": {"PAGE_VIEW": 15000, "PRODUCT_VIEW": 8500}
      },
      "segments": [...]
    },
    "product": {
      "topViewedProducts": [...],
      "topConvertingProducts": [...],
      "topRevenueProducts": [...]
    },
    "revenue": {
      "dailyRevenue": [...],
      "summary": {
        "totalRevenue": 125000.50,
        "totalOrders": 450,
        "averageOrderValue": 277.78
      }
    }
  }
}
```

#### POST /api/analytics/events

Batch event tracking endpoint.

**Request Body:**

```json
{
  "events": [
    {
      "eventType": "PRODUCT_VIEW",
      "properties": {
        "productId": "prod_123",
        "productName": "Summer Dress",
        "categoryId": "cat_456"
      },
      "timestamp": "2024-01-15T10:30:00Z",
      "userId": "user_789",
      "sessionId": "session_abc"
    }
  ]
}
```

#### POST /api/analytics/process

Process analytics data (for cron jobs).

**Authentication:** Bearer token required
**Request Body:**

```json
{
  "date": "2024-01-15"
}
```

## Dashboard Features

### Overview Dashboard

- Key performance indicators (KPIs)
- Revenue trends and growth metrics
- User acquisition and retention
- Top performing products
- Conversion funnel visualization

### Product Analytics

- Product performance metrics
- Conversion rates by product
- Revenue attribution
- Inventory turn rates
- Customer reviews and ratings

### User Analytics

- User behavior patterns
- Session analytics
- Device and browser breakdown
- Geographic insights
- Customer segmentation

### Conversion Analytics

- Funnel analysis
- Drop-off points identification
- A/B test results
- Cart abandonment analysis
- Checkout optimization metrics

### Search Analytics

- Search query analysis
- No-results queries
- Search-to-purchase conversion
- Filter usage patterns
- Trending searches

### Revenue Analytics

- Daily/monthly revenue trends
- Customer lifetime value
- Average order value trends
- Revenue by channel/source
- Discount effectiveness

## Data Processing

### Batch Processing

Analytics data is processed in batches using cron jobs:

```bash
# Daily analytics processing (runs at 1 AM UTC)
0 1 * * * curl -X POST "https://yoursite.com/api/analytics/process" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"date": "2024-01-15"}'
```

### Real-time Processing

Critical events are processed immediately:

- Purchase events
- User registrations
- High-value interactions

### Data Retention

- Raw events: 2 years
- Aggregated daily data: 5 years
- Cohort data: Indefinite
- User sessions: 1 year

## Performance Optimization

### Database Indexing

Strategic indexes on frequently queried fields:

```sql
-- Analytics events
CREATE INDEX idx_analytics_event_type ON "AnalyticsEvent"("eventType");
CREATE INDEX idx_analytics_timestamp ON "AnalyticsEvent"("timestamp");
CREATE INDEX idx_analytics_user_id ON "AnalyticsEvent"("userId");

-- Product analytics
CREATE INDEX idx_product_analytics_conversion_rate ON "ProductAnalytics"("conversionRate");
CREATE INDEX idx_product_analytics_revenue ON "ProductAnalytics"("revenue");

-- Search analytics
CREATE INDEX idx_search_analytics_date ON "SearchAnalytics"("date");
```

### Caching Strategy

- Dashboard data cached for 5 minutes
- Real-time metrics cached for 30 seconds
- Historical data cached for 1 hour

### Query Optimization

- Use aggregation pipelines for complex calculations
- Implement pagination for large datasets
- Pre-compute expensive metrics during batch processing

## Privacy and Compliance

### Data Collection

- Anonymous session tracking by default
- User consent required for personal data
- IP addresses are hashed for privacy
- Personally identifiable information (PII) is separate from analytics

### GDPR Compliance

- Right to data deletion implemented
- Data export functionality available
- Consent management integrated
- Data retention policies enforced

### Security

- Analytics API requires authentication
- Rate limiting on all endpoints
- Input validation and sanitization
- Encrypted data transmission

## Usage Examples

### Track Custom Business Events

```typescript
// Track newsletter signup
track("NEWSLETTER_SIGNUP", {
  source: "homepage_footer",
  email_domain: email.split("@")[1],
});

// Track feature usage
track("FEATURE_USED", {
  feature: "wishlist_share",
  user_segment: "premium",
});
```

### Monitor Key Metrics

```typescript
// Get real-time conversion rates
const analytics = await fetch("/api/analytics?realtime=true");
const conversionRate = analytics.conversion.funnels.find(
  (f) => f.stepName === "Purchase"
)?.conversionRate;

// Alert if conversion drops below threshold
if (conversionRate < 2.5) {
  sendAlert("Low conversion rate detected");
}
```

### Custom Dashboard Widgets

```tsx
import { useAnalytics } from "@/hooks/useAnalytics";

function CustomMetricWidget() {
  const { data } = useAnalytics({
    period: "7d",
    metrics: ["revenue", "conversion"],
  });

  return (
    <div className="metric-widget">
      <h3>Weekly Performance</h3>
      <p>Revenue: ${data.revenue.summary.totalRevenue}</p>
      <p>Conversion: {data.conversion.overallRate}%</p>
    </div>
  );
}
```

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Revenue Metrics**

   - Daily revenue drops > 20%
   - Average order value changes > 15%
   - Conversion rate drops > 10%

2. **Performance Metrics**

   - Page load times > 3 seconds
   - API response times > 500ms
   - Error rates > 1%

3. **User Experience**
   - Cart abandonment rate > 70%
   - Search no-results rate > 15%
   - Mobile conversion rate < 50% of desktop

### Alert Configuration

```javascript
// Example alert rules
const alertRules = {
  revenueDropAlert: {
    metric: "daily_revenue",
    threshold: -20, // 20% decrease
    timeframe: "24h",
    action: "email_team",
  },
  conversionRateAlert: {
    metric: "conversion_rate",
    threshold: 2.0, // below 2%
    timeframe: "1h",
    action: "slack_notification",
  },
};
```

## Future Enhancements

### Planned Features

1. **Machine Learning Integration**

   - Predictive analytics for customer churn
   - Automated anomaly detection
   - Personalized product recommendations

2. **Advanced Segmentation**

   - AI-powered customer clustering
   - Behavioral prediction models
   - Dynamic pricing optimization

3. **Real-time Dashboards**

   - Live data streaming
   - Interactive visualizations
   - Custom dashboard builder

4. **Enhanced Attribution**
   - Multi-touch attribution modeling
   - Cross-device tracking
   - Marketing channel effectiveness

## Support and Troubleshooting

### Common Issues

1. **Missing Analytics Data**

   - Check event tracking implementation
   - Verify API endpoints are accessible
   - Confirm database connections

2. **Performance Issues**

   - Review database query performance
   - Check for missing indexes
   - Monitor cache hit rates

3. **Data Accuracy**
   - Validate event tracking logic
   - Check for duplicate events
   - Verify timezone handling

### Debug Endpoints

- `GET /api/analytics/events?limit=10` - Recent events
- `GET /api/analytics/process` - Processing status
- `GET /api/metrics` - System health metrics

For additional support, check the application logs and monitoring dashboards for detailed error information.
