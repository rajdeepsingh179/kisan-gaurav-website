import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";

const SiteContentContext = createContext(null);
const parse = (value, fallback = {}) => { try { return JSON.parse(value || "{}"); } catch { return fallback; } };

export function SiteContentProvider({ children }) {
  const [payload, setPayload] = useState({ entries: [], menus: [] });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    apiFetch("/api/content/site").then((data) => { if (active) setPayload(data); }).catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const value = useMemo(() => {
    const entryRows = Array.isArray(payload?.entries) ? payload.entries : [];
    const menuRows = Array.isArray(payload?.menus) ? payload.menus : [];
    const entries = entryRows.map((entry) => ({ ...entry, content: parse(entry.content_json), seo: parse(entry.seo_json) }));
    return {
      loading,
      entries,
      menus: menuRows,
      byType: (type) => entries.filter((entry) => entry.entry_type === type),
      get: (type, slug) => entries.find((entry) => entry.entry_type === type && entry.slug === slug),
      menu: (location) => menuRows.filter((item) => item.menu_location === location),
    };
  }, [loading, payload]);
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSiteContent() {
  const context = useContext(SiteContentContext);
  if (!context) throw new Error("useSiteContent must be used within SiteContentProvider");
  return context;
}
