# Kisan Gaurav Corporate Website

The React and Vite corporate website for Kisan Gaurav, focused on clear,
farmer-first communication for Indian agriculture. It is isolated from and
does not modify the existing PWA application.

## Local development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint
npm run build
```

## Cloudflare Pages

- Root directory: `kisan-gaurav-website`
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: set `VITE_SITE_URL` to the production URL

The `public/_redirects` rule enables React Router routes to load directly.
