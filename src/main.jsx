import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { CommerceProvider } from "./contexts/CommerceContext";
import LanguageProvider from "./contexts/LanguageProvider";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <CommerceProvider>
        <LanguageProvider>
          <BrowserRouter><App /></BrowserRouter>
        </LanguageProvider>
      </CommerceProvider>
    </AuthProvider>
  </StrictMode>,
);
