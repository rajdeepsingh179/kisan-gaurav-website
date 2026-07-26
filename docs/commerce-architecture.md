# Commerce architecture

The React/Vite storefront is deployed as static assets on Cloudflare Pages. Firebase remains the application backend:

- Firebase Authentication: email/password and Google.
- Firestore: products, categories, customers, carts, orders, coupons, reviews, banners, returns and settings.
- Firebase Storage: catalog and banner assets; generated invoices are server-owned.
- Cloud Functions: authoritative checkout totals, order creation, Razorpay Orders API calls, payment-signature verification and returns.

The browser never receives `RAZORPAY_KEY_SECRET`. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` as Firebase Functions secrets. The public key ID is exposed through `VITE_RAZORPAY_KEY_ID`.

Assign the custom Firebase Auth claim `admin: true` only from a trusted server environment. Firestore and Storage rules use this claim for all administration writes.

Before payment testing, seed Firestore product documents with canonical variants and prices. Cloud Functions reject products or variants that are not active in Firestore, preventing client-side price manipulation.
