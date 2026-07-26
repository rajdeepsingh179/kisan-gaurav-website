import { BRAND } from "../design-system";

export const siteConfig = {
  name: BRAND.name,
  description: BRAND.description,
  url: (import.meta.env.VITE_SITE_URL || "https://kisangaurav.com").replace(/\/$/, ""),
  socialImage: "/og.webp",
};
