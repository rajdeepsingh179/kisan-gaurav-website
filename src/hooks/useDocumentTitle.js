import { useEffect } from "react";

import { siteConfig } from "../data/siteConfig";

export default function useDocumentTitle(pageTitle) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = pageTitle
      ? `${pageTitle} | ${siteConfig.name}`
      : siteConfig.name;

    return () => {
      document.title = previousTitle;
    };
  }, [pageTitle]);
}
