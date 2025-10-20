# Wallets: Apple Pay & Google Pay

This project supports express checkout via the Payment Request Button (PRB) using Apple Pay (Safari/iOS/macOS) and Google Pay (Chrome/Android/desktop with GPay).

The PRB is wired into:

- Checkout page (Payment Request Button alongside the Payment Element)
- Cart page (bag) for express checkout

When a supported wallet is available, the button appears automatically; otherwise it’s hidden.

## Requirements

- Stripe account with test or live keys
- Domain deployed over HTTPS (required for wallets)
- Apple Pay: Verified domain with Apple/Stripe
- Google Pay: Supported browser and a user with an available payment method

## Environment Variables

Client and server keys must be set:

- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET (recommended for full payment lifecycle)

## Apple Pay Domain Verification

Apple Pay requires a domain association file to be served exactly at:

`/.well-known/apple-developer-merchantid-domain-association`

Steps:

1. Generate the association file in the Apple Pay or Stripe Dashboard (Apple Pay domain verification section).
2. Replace the contents of `public/.well-known/apple-developer-merchantid-domain-association` with the exact file content (no extra whitespace or BOM).
3. Deploy your site so the file is accessible at `https://your-domain.com/.well-known/apple-developer-merchantid-domain-association`.
4. In Stripe/Apple, click Verify. On success, Apple Pay will be allowed for that domain.

Notes:

- File must be byte-for-byte identical to Apple’s version.
- Use your production domain for production verification and staging domain for staging as needed.
- You can keep multiple domains verified in Stripe.

## Payment Request Button Behavior

- The code checks `paymentRequest.canMakePayment()` to decide whether to show the button.
- The PRB collects a wallet-backed payment method and confirms the PaymentIntent.
- If the user isn’t authenticated on the cart page, we redirect to login and then proceed to checkout.

## Currency Handling

- The current implementation uses USD for the PRB on the cart page. If you support multiple currencies, wire the active currency code from your currency provider to the PRB configuration.

## Troubleshooting

- Button not showing:
  - Ensure HTTPS.
  - Ensure `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set.
  - Confirm `canMakePayment()` returns a result; test on a device/browser with Apple Wallet or Google Pay available.
  - For Apple Pay, verify the domain and confirm the association file is served with no extra whitespace.
- Apple Pay fails to appear on Safari:
  - Check domain verification in Stripe/Apple.
  - Use a real device with Wallet configured and a supported card.
- 400/401 on intent/checkout:
  - Confirm backend endpoints `/api/checkout` and `/api/payments/intent` are reachable.
  - Verify Stripe secret key and webhook secret.

## Validation Checklist

- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` present
- [ ] `STRIPE_SECRET_KEY` present (server)
- [ ] Webhook configured (optional but recommended)
- [ ] Apple Pay domain association file deployed to `/.well-known/`
- [ ] Domain verified in Stripe/Apple
- [ ] Tested on device with Apple Wallet or Google Pay
