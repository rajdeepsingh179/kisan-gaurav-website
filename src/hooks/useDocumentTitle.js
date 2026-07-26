import { useEffect } from "react";

import { siteConfig } from "../data/siteConfig";

export default function useDocumentTitle(pageTitle, description = siteConfig.description, options = {}) {
  useEffect(() => {
    const previousTitle = document.title;
    const title = pageTitle
      ? `${pageTitle} | ${siteConfig.name}`
      : siteConfig.name;
    const canonicalUrl = `${siteConfig.url}${window.location.pathname}`;
    const selectors = {
      description: 'meta[name="description"]',
      robots: 'meta[name="robots"]',
      ogTitle: 'meta[property="og:title"]',
      ogDescription: 'meta[property="og:description"]',
      ogUrl: 'meta[property="og:url"]',
      twitterTitle: 'meta[name="twitter:title"]',
      twitterDescription: 'meta[name="twitter:description"]',
    };
    const previous = Object.fromEntries(
      Object.entries(selectors).map(([key, selector]) => [key, document.querySelector(selector)?.content]),
    );
    const canonical = document.querySelector('link[rel="canonical"]');
    const previousCanonical = canonical?.href;

    document.title = title;
    document.querySelector(selectors.description)?.setAttribute("content", description);
    document.querySelector(selectors.robots)?.setAttribute("content", options.noIndex ? "noindex, nofollow" : "index, follow");
    document.querySelector(selectors.ogTitle)?.setAttribute("content", title);
    document.querySelector(selectors.ogDescription)?.setAttribute("content", description);
    document.querySelector(selectors.ogUrl)?.setAttribute("content", canonicalUrl);
    document.querySelector(selectors.twitterTitle)?.setAttribute("content", title);
    document.querySelector(selectors.twitterDescription)?.setAttribute("content", description);
    canonical?.setAttribute("href", canonicalUrl);

    return () => {
      document.title = previousTitle;
      Object.entries(selectors).forEach(([key, selector]) => {
        const element = document.querySelector(selector);
        if (element && previous[key] !== undefined) element.setAttribute("content", previous[key]);
      });
      if (canonical && previousCanonical) canonical.setAttribute("href", previousCanonical);
    };
  }, [description, options.noIndex, pageTitle]);
}
