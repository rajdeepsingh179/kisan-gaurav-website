import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { CatalogProvider } from "./contexts/CatalogContext";
import { CommerceProvider } from "./contexts/CommerceContext";
import LanguageProvider from "./contexts/LanguageProvider";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <CatalogProvider>
        <CommerceProvider>
          <LanguageProvider>
            <BrowserRouter><App /></BrowserRouter>
          </LanguageProvider>
        </CommerceProvider>
      </CatalogProvider>
    </AuthProvider>
  </StrictMode>,
);
