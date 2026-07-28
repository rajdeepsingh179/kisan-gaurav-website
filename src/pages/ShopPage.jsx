import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import ProductCard from "../components/storefront/ProductCard";
import { useCatalog } from "../contexts/CatalogContext";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function ShopPage() {
  const { categories, products } = useCatalog();
  const [params] = useSearchParams();
  const initialCategory = categories.some((item) => item.id === params.get("category")) ? params.get("category") : "all";
  const [active, setActive] = useState(initialCategory);
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState(2000);
  const [mobileFilters, setMobileFilters] = useState(false);
  useDocumentTitle("Shop");

  const visible = useMemo(() => products.filter((item) => {
    const matchesCategory = active === "all" || item.category === active;
    const searchText = `${item.name} ${item.ingredients} ${item.note}`.toLowerCase();
    return matchesCategory && item.price <= maxPrice && searchText.includes(query.trim().toLowerCase());
  }), [active, maxPrice, products, query]);

  const clearFilters = () => {
    setActive("all");
    setQuery("");
    setMaxPrice(2000);
  };

  return (
    <div className="page-shell">
      <section className="page-hero page-hero--shop">
        <p className="eyebrow">The Kisan Gaurav pantry</p>
        <h1>Everyday nourishment,<br /><em>beautifully considered.</em></h1>
        <p>Search and explore premium nuts, roasted makhana, purposeful mixtures and thoughtful gifts.</p>
      </section>
      <section className="catalog-section" aria-labelledby="shop-heading">
        <div className="catalog-toolbar">
          <label className="search-box">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search products</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or ingredients" type="search" />
            {query ? <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button> : null}
          </label>
          <button className="mobile-filter-button" type="button" aria-controls="product-filters" aria-expanded={mobileFilters} onClick={() => setMobileFilters((value) => !value)}><SlidersHorizontal size={17} aria-hidden="true" /> Filters</button>
          <span aria-live="polite">{visible.length} products</span>
        </div>
        <div className="catalog-layout">
          <aside id="product-filters" className={`filter-panel ${mobileFilters ? "is-open" : ""}`} aria-label="Product filters">
            <div className="filter-panel__heading"><strong>Filters</strong><button type="button" onClick={clearFilters}>Clear all</button></div>
            <fieldset>
              <legend>Category</legend>
              <label><input checked={active === "all"} onChange={() => setActive("all")} type="radio" name="category" /> All products <span>{products.length}</span></label>
              {categories.map((category) => (
                <label key={category.id}>
                  <input checked={active === category.id} onChange={() => setActive(category.id)} type="radio" name="category" />
                  {category.name}<span>{products.filter((item) => item.category === category.id).length}</span>
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Price</legend>
              <div className="price-values"><span>₹0</span><strong>Up to ₹{maxPrice.toLocaleString("en-IN")}</strong></div>
              <input className="price-range" type="range" min="300" max="2000" step="100" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} aria-label="Maximum price" />
            </fieldset>
          </aside>
          <div>
            <div className="filter-bar filter-bar--catalog">
              <div><span className="eyebrow">Shop the collection</span><h2 id="shop-heading">{active === "all" ? "All products" : categories.find((item) => item.id === active)?.name}</h2></div>
            </div>
            {visible.length ? (
              <div className="product-grid">{visible.map((item, index) => <ProductCard item={item} key={item.slug} priority={index < 4} />)}</div>
            ) : (
              <div className="empty-results"><Search size={28} /><h3>No products found</h3><p>Try another search or broaden your filters.</p><button type="button" onClick={clearFilters}>Reset filters</button></div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
