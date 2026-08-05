import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { CatalogProvider } from "./contexts/CatalogContext";
import { CommerceProvider } from "./contexts/CommerceContext";
import { SiteContentProvider } from "./contexts/SiteContentContext";
import LanguageProvider from "./contexts/LanguageProvider";
import "./index.css";

const isPreviewHost = /(?:pages\.dev|chatgpt\.site)$/i.test(window.location.hostname);
const isAdminRoute = window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/");

if (isPreviewHost && isAdminRoute) {
  window.location.replace(`https://kisangaurav.com${window.location.pathname}${window.location.search}${window.location.hash}`);
} else {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <AuthProvider>
        <CatalogProvider>
          <SiteContentProvider>
            <CommerceProvider>
              <LanguageProvider>
                <BrowserRouter><App /></BrowserRouter>
              </LanguageProvider>
            </CommerceProvider>
          </SiteContentProvider>
        </CatalogProvider>
      </AuthProvider>
    </StrictMode>,
  );
}
