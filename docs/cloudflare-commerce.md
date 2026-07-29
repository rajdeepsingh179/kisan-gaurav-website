# Kisan Gaurav Cloudflare commerce architecture

## Runtime

- `dist/` is deployed to Cloudflare Pages and served through Cloudflare CDN.
- `worker/` is an independently deployable Cloudflare Worker API.
- `worker/migrations/` versions the D1 commerce schema.
- The Worker uses the `DB` D1 binding and `MEDIA` R2 binding.

## Authentication

Auth.js runs inside the Worker at `/api/auth/*` with JWT sessions, Google OAuth and a credentials provider. Passwords are PBKDF2-SHA-256 derived with unique salts and Cloudflare Workers' maximum 100,000 iterations. Customer and admin authorization is checked inside Worker routes; `/api/admin/*` requires `ADMIN` or `SUPER_ADMIN`.

Configure Worker secrets:

```text
AUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
NOTIFICATION_WEBHOOK_SECRET
```

Set `FRONTEND_URL`, `AUTH_URL`, `R2_PUBLIC_BASE_URL`, and optionally `NOTIFICATION_WEBHOOK` as Worker variables.

## Data and media

D1 stores users, OAuth accounts, reset tokens, profiles, addresses, products, variants, stock history, carts, wishlists, coupons, orders, tracking history, returns, reviews, banners, analytics, notifications and settings. All query inputs use prepared statement bindings.

R2 stores profile photos, catalog media, banners and private invoice payloads. Upload endpoints validate role, type and size.

## Payments

The browser receives only the Razorpay public key ID. The Worker creates the Razorpay order using canonical server prices, recalculates coupons/shipping/GST, verifies the HMAC payment signature, persists the order and decrements stock in a D1 batch.

## Deployment

1. Create D1 database `kisan-gaurav-commerce` and R2 bucket `kisan-gaurav-media`.
2. Replace the placeholder D1 ID in `worker/wrangler.toml`.
3. Run `wrangler d1 migrations apply kisan-gaurav-commerce --config worker/wrangler.toml --remote`.
4. Set Worker secrets and deploy with `npm --prefix worker run deploy`.
5. Set `VITE_API_BASE_URL` in Cloudflare Pages and run `npm run pages:deploy`.
