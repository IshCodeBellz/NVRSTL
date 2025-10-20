# Production Deployment Guide

This guide covers multiple deployment strategies for DY Official, from simple Vercel deployments to comprehensive production setups with Docker.

## Table of Contents

1. [Quick Setup (Vercel + PostgreSQL)](#quick-setup-vercel--postgresql)
2. [Enterprise Production Deployment](#enterprise-production-deployment)
3. [Zero-Downtime Deployment](#zero-downtime-deployment)
4. [Health Checks & Monitoring](#health-checks--monitoring)
5. [Troubleshooting](#troubleshooting)

## Quick Setup (Vercel + PostgreSQL)

### 1. Database Setup (Choose One)

#### Option A: Railway (Recommended - Free tier available)

1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Add PostgreSQL database
4. Copy the DATABASE_URL from Railway dashboard

#### Option B: Neon (Serverless PostgreSQL)

1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string

#### Option C: Supabase

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings > Database
4. Copy the connection string

### 2. Vercel Deployment

#### Environment Variables to Add in Vercel Dashboard:

```bash
# Database
DATABASE_URL="your_postgresql_url_here"

# Auth
NEXTAUTH_SECRET="generate-a-secure-random-string"
NEXTAUTH_URL="https://your-app.vercel.app"

# Email (Optional - for email verification/password reset)
EMAIL_FROM="Your Store <no-reply@yourdomain.com>"
RESEND_API_KEY="your_resend_api_key"

# Stripe (Use test keys first, then production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_or_test_key"
STRIPE_SECRET_KEY="sk_live_or_test_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
```

### 3. GitHub Repository Secrets

Add these to your GitHub repository (Settings → Secrets and Variables → Actions):

```bash
DATABASE_URL="your_postgresql_url_here"
NEXTAUTH_SECRET="same-as-vercel"
```

### 4. Database Migration

After deploying to Vercel, run this command locally to migrate your production database:

```bash
# Point to production database
export DATABASE_URL="your_postgresql_url_here"

# Run migrations
npx prisma migrate deploy

# Generate client
npx prisma generate

# Optional: Seed with sample data
npm run prisma:seed
```

### 5. Stripe Webhook Setup (If using payments)

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy webhook secret to Vercel environment variables

### 6. Apple Pay Domain Verification (If using Apple Pay)

1. In Stripe Dashboard → Payments → Apple Pay, add your domain
2. Download the association file provided
3. Replace the contents of `public/.well-known/apple-developer-merchantid-domain-association` with that file (no extra whitespace)
4. Deploy and verify the domain in Stripe
5. Test Apple Pay on Safari/iOS/macOS with Wallet configured

### 6. Email Setup (Optional)

1. Sign up for [Resend](https://resend.com)
2. Verify your domain or use their test domain
3. Get API key and add to Vercel environment variables

## Local Development with Production Database

```bash
# Copy your production DATABASE_URL to .env.local
echo 'DATABASE_URL="your_postgresql_url"' >> .env.local

# Reset local schema to match production
npx prisma migrate reset

# Or push current schema to production
npx prisma db push
```

## Troubleshooting

### Common Issues:

1. **Database Connection Errors**

   - Ensure DATABASE_URL is correctly formatted
   - Check if database allows external connections
   - Verify IP restrictions (most cloud DBs allow all IPs by default)

2. **Prisma Migration Errors**

   - Run `npx prisma generate` after schema changes
   - Use `npx prisma db push` for development, `npx prisma migrate deploy` for production

3. **Build Errors on Vercel**
   - Ensure all environment variables are set
   - Check build logs for specific errors
   - Verify Node.js version compatibility

### Environment Variable Checklist:

- [ ] DATABASE_URL (PostgreSQL connection string)
- [ ] NEXTAUTH_SECRET (random string, same everywhere)
- [ ] NEXTAUTH_URL (your production URL)
- [ ] EMAIL_FROM (optional, for emails)
- [ ] RESEND_API_KEY (optional, for emails)
- [ ] Stripe keys (if using payments)
- [ ] Apple Pay domain association file deployed and verified (if using Apple Pay)

## Next Steps

1. Deploy to Vercel
2. Set up production database
3. Configure environment variables
4. Run database migrations
5. Test core functionality
6. Set up monitoring (optional)
7. Verify wallets (Apple Pay / Google Pay) on supported devices

## Enterprise Production Deployment

For high-performance production environments, use our comprehensive deployment system:

### Prerequisites

- Docker and Docker Compose
- PostgreSQL 16+
- Redis (recommended for caching)
- SSL certificates
- Domain with DNS configured

### Automated Deployment

Use our production deployment script for zero-downtime deployments:

```bash
# Basic production deployment
./scripts/deploy.sh

# Deployment with data seeding
./scripts/deploy.sh --seed

# Custom deployment strategy
./scripts/deploy.sh --strategy docker

# View deployment options
./scripts/deploy.sh --help
```

### Manual Docker Deployment

```bash
# 1. Create production environment
cp .env.example .env.production
# Configure all required environment variables

# 2. Deploy with Docker Compose
docker-compose -f docker-compose.production.yml up -d --build

# 3. Run database migrations
docker-compose exec app npx prisma migrate deploy

# 4. Seed production data
docker-compose exec app npx tsx scripts/seed-production.ts

# 5. Optimize database
docker-compose exec app npx tsx scripts/optimize-database.ts

# 6. Warm cache
docker-compose exec app npx tsx scripts/warm-cache.ts
```

### Production Environment Variables

Create `.env.production` with these required variables:

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-super-secure-secret

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@postgres:5432/dyofficial
POSTGRES_DB=dyofficial
POSTGRES_USER=dyofficial
POSTGRES_PASSWORD=secure-password

# Redis (recommended)
REDIS_URL=redis://redis:6379

# Email (Resend)
RESEND_API_KEY=your-resend-api-key

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
WEBHOOK_SECRET=whsec_...

# Monitoring
SENTRY_DSN=your-sentry-dsn

# Admin
ADMIN_EMAIL=admin@your-domain.com

# Optional: Notifications
SLACK_WEBHOOK_URL=your-slack-webhook
```

## Zero-Downtime Deployment

Our deployment script includes:

- **Health Checks**: Validates all services before switching traffic
- **Backup Creation**: Automatic backups before deployment
- **Rollback Capability**: Quick rollback on failure
- **Performance Optimization**: Database optimization and cache warming
- **Monitoring Integration**: Sends deployment notifications

### Deployment Features

```bash
# Monitor deployment progress
tail -f logs/deployment-$(date +%Y%m%d)*.log

# Check deployment status
docker-compose -f docker-compose.production.yml ps

# View application logs
docker-compose -f docker-compose.production.yml logs -f app

# Emergency rollback
./scripts/deploy.sh --rollback
```

## Health Checks & Monitoring

### Built-in Health Endpoints

```bash
# Overall system health
curl https://your-domain.com/api/health

# Database health
curl https://your-domain.com/api/health/database

# Redis health
curl https://your-domain.com/api/health/redis
```

### Performance Monitoring

```bash
# Run performance analysis
docker-compose exec app npx tsx scripts/analyze-performance.ts

# Monitor database performance
docker-compose exec app npx tsx scripts/optimize-database.ts

# Check Redis cache status
docker-compose exec redis redis-cli INFO memory
```

### Production Monitoring Setup

1. **Uptime Monitoring**: Configure external monitoring for `/api/health`
2. **Error Tracking**: Sentry integration for error monitoring
3. **Performance Monitoring**: Built-in performance dashboards
4. **Log Aggregation**: Centralized logging with log rotation
5. **Backup Monitoring**: Automated backup verification

## Quick Setup (Vercel) vs Enterprise Deployment

| Feature         | Vercel Setup  | Enterprise Docker |
| --------------- | ------------- | ----------------- |
| Setup Time      | 15 minutes    | 1-2 hours         |
| Performance     | Good          | Excellent         |
| Scalability     | Auto-scaling  | Manual scaling    |
| Customization   | Limited       | Full control      |
| Cost            | $20-100/month | $50-500/month     |
| Backup/Recovery | Basic         | Comprehensive     |
| Monitoring      | Basic         | Advanced          |
| Zero-downtime   | Automatic     | Configured        |

Choose Vercel for quick setup and automatic scaling, or Docker for full control and enterprise features.

## Production Checklist

### Basic Deployment (Vercel)

- [ ] PostgreSQL database configured
- [ ] All environment variables set in Vercel
- [ ] Database migrations deployed
- [ ] Stripe webhooks configured (if applicable)
- [ ] Email service configured (if applicable)
- [ ] Domain configured in Vercel
- [ ] SSL certificate active
- [ ] Error monitoring set up (Sentry)

### Enterprise Deployment (Docker)

- [ ] Docker and Docker Compose installed
- [ ] Production environment variables configured
- [ ] SSL certificates configured
- [ ] Database backup strategy implemented
- [ ] Redis caching configured
- [ ] Performance monitoring active
- [ ] Log aggregation configured
- [ ] Automated deployment pipeline
- [ ] Rollback procedures tested
- [ ] Health check monitoring
- [ ] Security audit completed
