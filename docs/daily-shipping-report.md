# Daily Shipping Report

Generate and email a CSV of all orders and their shipping addresses for a given day. Designed to run daily at 22:00 (10pm) via a secure cron endpoint.

## Endpoint

- URL: `/api/cron/daily-order-shipping`
- Method: POST
- Auth: `Authorization: Bearer <CRON_SECRET>`
- Body (optional): `{ "date": "YYYY-MM-DD" }` (defaults to today in server timezone)

### Example request

Headers:

- `Authorization: Bearer ${CRON_SECRET}`
- `Content-Type: application/json`

Body:

```json
{ "date": "2025-10-16" }
```

Response:

```json
{ "success": true, "count": 42, "date": "2025-10-16" }
```

## Required environment variables

- `CRON_SECRET` (required): Strong secret to authorize the cron endpoint.
- `ADMIN_EMAIL_RECIPIENTS` (recommended): Comma-separated admin emails to receive the report.
  - Fallback: `ALERT_EMAIL_RECIPIENTS` if `ADMIN_EMAIL_RECIPIENTS` is not set.
- SMTP/Email settings (required to send email):
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
  - `SMTP_FROM` or `EMAIL_FROM`

## CSV columns

These match the current implementation in `lib/server/reports/orderShippingReport.ts`:

- orderId
- createdAt
- status
- customerEmail
- fullName
- address1
- address2
- city
- region
- postalCode
- country
- items
- totalCents
- currency

## Scheduling

Use your hosting platform’s scheduler (preferred) or any external cron to call the endpoint daily at 22:00.

- Path: `POST https://<your-domain>/api/cron/daily-order-shipping`
- Header: `Authorization: Bearer ${CRON_SECRET}`
- Body: `{}` (optional)

## Local testing

You can run the report generator directly; it will send emails using your local env values.

- Today:
  - `npm run report:shipping:today`
- Specific date (YYYY-MM-DD):
  - `npm run report:shipping:date -- 2025-10-16`

Make sure `.env.local` contains a working database URL and SMTP settings.
