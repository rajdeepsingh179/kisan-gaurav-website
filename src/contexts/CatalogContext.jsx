import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [payload, setPayload] = useState({ categories: [], products: [] });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    apiFetch("/api/catalog").then((data) => { if (active) setPayload(data); }).catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const value = useMemo(() => {
    const categories = payload.categories.map((category) => ({
      ...category,
      id: category.slug,
      eyebrow: category.short_description || category.description || "",
      description: category.long_description || category.description || "",
      heroImage: category.hero_image_url || category.image_url || category.thumbnail_url,
    }));
    const products = payload.products.map((product) => {
      const variants = (product.variants || []).map((variant) => variant.name);
      const variantDetails = Object.fromEntries((product.variants || []).map((variant) => [variant.name, variant]));
      const defaultVariant = product.variants?.find((variant) => variant.is_default) || product.variants?.[0];
      return {
        ...product,
        category: product.category_slug,
        ingredients: product.ingredients || "",
        note: product.benefits || product.description || "",
        featured: Boolean(product.featured),
        price: Number(defaultVariant?.festival_price_paise || defaultVariant?.price_paise || 0) / 100,
        rating: Number(product.rating || 0),
        reviewCount: Number(product.review_count || 0),
        badge: product.new_arrival ? "New" : product.best_seller ? "Best Seller" : null,
        variants,
        variantDetails,
        image: product.image_url,
        detailImage: product.detail_image_url || product.image_url,
      };
    });
    return {
      loading, categories, products,
      categoryById: Object.fromEntries(categories.map((category) => [category.id, category])),
      productBySlug: Object.fromEntries(products.map((product) => [product.slug, product])),
    };
  }, [loading, payload]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error("useCatalog must be used within CatalogProvider");
  return context;
}
