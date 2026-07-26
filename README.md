# Kisan Gaurav Commerce

Production-oriented ecommerce storefront and operations platform for Kisan
Gaurav. The React 19 application is deployed to Cloudflare Pages; the Hono API
runs on Cloudflare Workers with D1 for relational data and R2 for media and
invoices.

## Local development

```bash
npm install
npm --prefix worker install
npm run dev
```

## Quality checks

```bash
npm run lint
npm run build
npm run worker:check
```

## Cloudflare deployment

Copy `.env.example` to `.env.local`, then configure the Worker bindings and
secrets described in [docs/cloudflare-commerce.md](docs/cloudflare-commerce.md).

```bash
npx wrangler login
npx wrangler d1 migrations apply kisan-gaurav-commerce --remote --config worker/wrangler.toml
npm --prefix worker run deploy
npm run build
npm run pages:deploy
```

Cloudflare Pages uses `dist` as its build output. `public/_redirects` enables
direct loading of React Router URLs.
