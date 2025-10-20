# DY Official - Production Environment Setup Guide

This guide walks you through setting up a complete production environment for DY Official e-commerce platform with automated validation and deployment tools.

## 🚀 Quick Start

1. **Copy the production template:**

   ```bash
   cp .env.production.template .env.production
   ```

2. **Run environment validation:**

   ```bash
   npm run env:validate:production
   ```

3. **Follow the setup instructions below for each service**

## 🔧 Required Services Configuration

### 1. Database (PostgreSQL) ✅ **CRITICAL**

```bash
DATABASE_URL="postgresql://username:password@host:5432/database_name"
```

**Setup Options:**

- **Railway**: Automatic PostgreSQL provisioning
- **Supabase**: Managed PostgreSQL with built-in auth
- **AWS RDS**: Scalable managed PostgreSQL
- **Neon**: Serverless PostgreSQL

**Migration Commands:**

```bash
npx prisma migrate deploy
npx prisma generate
npm run seed:production
```

### 2. Authentication (NextAuth.js) ✅ **CRITICAL**

```bash
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="32-character-minimum-secure-secret"
```

**Generate Secret:**

```bash
openssl rand -base64 32
```

### 3. Webhooks ✅ **CRITICAL**

```bash
WEBHOOK_BASE_URL="https://your-domain.com/api/webhooks"
```

## 📋 Detailed Configuration Steps

### 1. Database Configuration

```bash
# Required: PostgreSQL database
DATABASE_URL="postgresql://username:password@hostname:5432/database"

# Performance settings
DATABASE_CONNECTION_LIMIT="20"
DATABASE_POOL_TIMEOUT="20000"
```

**Setup Instructions:**

1. Create production PostgreSQL database
2. Run migrations: `npx prisma migrate deploy`
3. Test connection: `npx prisma db pull`

### 2. Shipping Carrier Configuration

Choose your primary carriers and obtain API credentials:

#### Royal Mail (UK Domestic)

```bash
ROYAL_MAIL_API_KEY="your-api-key"
ROYAL_MAIL_API_SECRET="your-api-secret"
ROYAL_MAIL_ENVIRONMENT="production"
```

**Setup Process:**

1. Apply for Royal Mail API access: [Royal Mail Developer Portal](https://developer.royalmail.net/)
2. Complete business verification process (2-4 weeks)
3. Obtain production API keys
4. Configure webhook endpoint for tracking updates

#### DPD (Express Delivery)

```bash
DPD_API_KEY="your-api-key"
DPD_ACCOUNT_NUMBER="your-account-number"
DPD_ENVIRONMENT="production"
```

**Setup Process:**

1. Contact DPD business development team
2. Complete account setup and credit checks
3. Request API access through DPD portal
4. Test in sandbox environment first

#### International Carriers (FedEx, UPS, DHL)

Required for international shipping:

```bash
# FedEx
FEDEX_API_KEY="your-api-key"
FEDEX_ACCOUNT_NUMBER="your-account-number"
FEDEX_METER_NUMBER="your-meter-number"

# UPS
UPS_API_KEY="your-api-key"
UPS_ACCOUNT_NUMBER="your-account-number"

# DHL
DHL_API_KEY="your-api-key"
DHL_ACCOUNT_NUMBER="your-account-number"
```

### 3. Webhook Configuration

Webhooks enable real-time tracking updates from carriers.

```bash
WEBHOOK_BASE_URL="https://yourdomain.com/api/webhooks"
WEBHOOK_RETRY_ATTEMPTS="3"
WEBHOOK_RETRY_DELAY_MS="1000"
```

**Implementation Steps:**

1. Deploy webhook endpoints to production
2. Configure each carrier's webhook URL in their portal
3. Test webhook delivery with sandbox data
4. Set up webhook signature verification
5. Monitor webhook delivery success rates

**Webhook Endpoints:**

- Royal Mail: `https://yourdomain.com/api/webhooks/shipping/royal-mail`
- DPD: `https://yourdomain.com/api/webhooks/shipping/dpd`
- FedEx: `https://yourdomain.com/api/webhooks/shipping/fedex`
- UPS: `https://yourdomain.com/api/webhooks/shipping/ups`
- DHL: `https://yourdomain.com/api/webhooks/shipping/dhl`

### 4. Monitoring & Alerting Setup

#### Sentry (Error Tracking)

```bash
SENTRY_DSN="https://your-dsn@sentry.io/project-id"
SENTRY_ENVIRONMENT="production"
```

**Setup Steps:**

1. Create Sentry project for DY Official
2. Configure error tracking for shipping operations
3. Set up alerts for critical shipping failures
4. Configure performance monitoring

**Key Alerts to Configure:**

- Shipping API failures (>5% error rate)
- Webhook delivery failures
- Database connection issues
- High response times (>2s for shipping operations)

#### Health Checks

```bash
HEALTH_CHECK_ENABLED="true"
HEALTH_CHECK_INTERVAL_MS="60000"
```

**Monitored Services:**

- Database connectivity
- Carrier API availability
- Redis/cache connectivity
- Webhook endpoint accessibility

### 5. Notification Services

#### Email (Required)

```bash
# Recommended: Resend (reliable, good deliverability)
RESEND_API_KEY="your-resend-api-key"

# Alternative: SendGrid
SENDGRID_API_KEY="your-sendgrid-api-key"
```

#### SMS (Optional)

```bash
# Twilio (recommended)
TWILIO_ACCOUNT_SID="your-account-sid"
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_PHONE_NUMBER="your-twilio-number"
```

### 6. Performance & Caching

#### Redis (Highly Recommended)

```bash
REDIS_URL="redis://username:password@hostname:6379"
REDIS_TTL_SECONDS="3600"
```

**Redis Usage:**

- Shipping rate caching (15 minutes TTL)
- Carrier API response caching
- Session storage
- Real-time data caching

### 7. Security Configuration

```bash
# Rate limiting
RATE_LIMIT_REQUESTS_PER_MINUTE="100"

# CORS
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# Security headers
SECURITY_HEADERS_ENABLED="true"
HSTS_MAX_AGE_SECONDS="31536000"
```

## 🧪 Testing Your Setup

### 1. Environment Validation Script

Create and run this validation script:

```typescript
// scripts/validate-production-env.ts
import { validateProductionEnvironment } from "@/lib/server/config/validateEnv";

async function runValidation() {
  const result = await validateProductionEnvironment();
  console.log("Environment validation:", result);
}

runValidation();
```

### 2. Carrier API Testing

Test each carrier API in sandbox mode:

```bash
# Test Royal Mail API
npm run test:carrier -- --carrier=royal-mail --mode=sandbox

# Test DPD API
npm run test:carrier -- --carrier=dpd --mode=sandbox
```

### 3. Webhook Testing

Use webhook testing tools:

```bash
# Test webhook endpoints
curl -X POST https://yourdomain.com/api/webhooks/shipping/test \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 4. End-to-End Testing

Complete workflow test:

1. Create test order
2. Process through fulfillment
3. Generate shipping label
4. Track delivery updates
5. Verify customer notifications

## 📊 Production Monitoring Checklist

### Daily Monitoring

- [ ] Shipping API success rates (>95%)
- [ ] Webhook delivery rates (>98%)
- [ ] Order processing times (<2 minutes average)
- [ ] Customer notification delivery rates (>99%)

### Weekly Monitoring

- [ ] Carrier cost analysis and optimization
- [ ] Customer satisfaction scores
- [ ] System performance metrics
- [ ] Error rate trends

### Monthly Monitoring

- [ ] Security audit and credential rotation
- [ ] Performance optimization review
- [ ] Business metrics analysis
- [ ] Disaster recovery testing

## 🚨 Troubleshooting Common Issues

### Carrier API Failures

1. Check API credentials and account status
2. Verify webhook signatures
3. Monitor rate limiting
4. Check carrier service status pages

### Webhook Delivery Issues

1. Verify endpoint accessibility
2. Check webhook signature validation
3. Monitor retry mechanism
4. Validate SSL certificate

### Performance Issues

1. Monitor database connection pool
2. Check Redis connectivity
3. Analyze slow API responses
4. Review caching effectiveness

## 📞 Support Contacts

### Carrier Support

- **Royal Mail API**: developer.support@royalmail.com
- **DPD**: api.support@dpd.co.uk
- **FedEx**: developer.support@fedex.com
- **UPS**: developer.support@ups.com
- **DHL**: developer.support@dhl.com

### Service Providers

- **Sentry Support**: support@sentry.io
- **Resend Support**: support@resend.com
- **Twilio Support**: support@twilio.com

---

## 🔄 Next Steps After Environment Setup

1. **Deploy to Production**: Deploy application with production environment
2. **Load Testing**: Test under production load conditions
3. **Monitoring Setup**: Configure all alerts and dashboards
4. **Documentation**: Update runbooks and operational procedures
5. **Team Training**: Train support team on new shipping features

For implementation assistance, see:

- `/docs/DEPLOYMENT_GUIDE.md`
- `/docs/OPERATIONAL_RUNBOOK.md`
- `/docs/TROUBLESHOOTING.md`
