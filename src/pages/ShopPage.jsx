import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import FilterChip from "../components/storefront/FilterChip";
import ProductCard from "../components/storefront/ProductCard";
import { useCatalog } from "../contexts/CatalogContext";
import { useSiteContent } from "../contexts/SiteContentContext";
import useDocumentTitle from "../hooks/useDocumentTitle";

const priceFilters = [
  [Number.POSITIVE_INFINITY, "Any price"],
  [500, "Under ₹500"],
  [1000, "Under ₹1,000"],
  [1500, "Under ₹1,500"],
  [2000, "Under ₹2,000"],
];

const sortFilters = [
  ["popular", "Popular"],
  ["price-low", "Price: Low to High"],
  ["price-high", "Price: High to Low"],
  ["rating", "Top Rated"],
  ["newest", "Newest"],
];

const defaultFeatures = {
  bestSeller: false,
  newArrival: false,
  organic: false,
  inStock: false,
  discount: false,
};

const variantValues = (item) => Object.values(item.variantDetails || {});
const isInStock = (item) => variantValues(item).some((variant) => Number(variant.stock) > 0);
const isDiscounted = (item) => variantValues(item).some((variant) => {
  const price = Number(variant.price_paise || 0);
  return Number(variant.discount_basis_points) > 0
    || (Number(variant.festival_price_paise) > 0 && Number(variant.festival_price_paise) < price)
    || Number(variant.compare_at_price_paise) > price
    || Number(variant.mrp_paise) > price;
});
const isOrganic = (item) => /\borganic\b/i.test(`${item.name} ${item.ingredients} ${item.note}`);

export default function ShopPage() {
  const { categories, products } = useCatalog();
  const { get } = useSiteContent();
  const searchManagement = get("search", "settings")?.content || {};
  const [params] = useSearchParams();
  const initialCategory = categories.some((item) => item.id === params.get("category")) ? params.get("category") : "all";
  const [active, setActive] = useState(initialCategory);
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState(Number.POSITIVE_INFINITY);
  const [minimumRating, setMinimumRating] = useState(0);
  const [sort, setSort] = useState("popular");
  const [features, setFeatures] = useState(defaultFeatures);
  useDocumentTitle("Shop");

  const visible = useMemo(() => products.filter((item) => {
    const matchesCategory = active === "all" || item.category === active;
    const searchText = `${item.name} ${item.ingredients} ${item.note}`.toLowerCase();
    return matchesCategory
      && item.price <= maxPrice
      && item.rating >= minimumRating
      && (!features.bestSeller || Boolean(item.best_seller))
      && (!features.newArrival || Boolean(item.new_arrival))
      && (!features.organic || isOrganic(item))
      && (!features.inStock || isInStock(item))
      && (!features.discount || isDiscounted(item))
      && searchText.includes(query.trim().toLowerCase());
  }).sort((left, right) => {
    if (sort === "price-low") return left.price - right.price;
    if (sort === "price-high") return right.price - left.price;
    if (sort === "rating") return right.rating - left.rating || right.reviewCount - left.reviewCount;
    if (sort === "newest") return Number(Boolean(right.new_arrival)) - Number(Boolean(left.new_arrival));
    const popular = searchManagement.popularProductIds || [];
    const leftIndex = popular.findIndex((value) => value === left.id || value === left.slug);
    const rightIndex = popular.findIndex((value) => value === right.id || value === right.slug);
    return (leftIndex < 0 ? 999 : leftIndex) - (rightIndex < 0 ? 999 : rightIndex);
  }), [active, features, maxPrice, minimumRating, products, query, searchManagement.popularProductIds, sort]);

  const availability = useMemo(() => ({
    organic: products.some(isOrganic),
    inStock: products.some(isInStock),
    discount: products.some(isDiscounted),
  }), [products]);

  const toggleFeature = (key) => setFeatures((current) => ({ ...current, [key]: !current[key] }));
  const clearFilters = () => {
    setActive("all");
    setQuery("");
    setMaxPrice(Number.POSITIVE_INFINITY);
    setMinimumRating(0);
    setSort("popular");
    setFeatures(defaultFeatures);
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
          <span aria-live="polite">{visible.length} products</span>
        </div>
        {!query && (searchManagement.trendingSearches || []).length ? (
          <div className="cms-search-suggestions">
            <span>Trending</span>
            {searchManagement.trendingSearches.map((term) => <FilterChip onClick={() => setQuery(term)} key={term}>{term}</FilterChip>)}
          </div>
        ) : null}
        <div id="product-filters" className="filter-panel filter-panel--chips" role="region" aria-label="Product filters">
          <div className="filter-panel__heading"><strong>Filters</strong><button type="button" onClick={clearFilters}>Clear all</button></div>
          <fieldset>
            <legend>Category</legend>
            <div className="filter-chip-row">
              <FilterChip active={active === "all"} onClick={() => setActive("all")}>All products <span>{products.length}</span></FilterChip>
              {categories.map((category) => (
                <FilterChip active={active === category.id} onClick={() => setActive(category.id)} key={category.id}>
                  {category.name} <span>{products.filter((item) => item.category === category.id).length}</span>
                </FilterChip>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Price</legend>
            <div className="filter-chip-row">
              {priceFilters.map(([value, label]) => <FilterChip active={maxPrice === value} onClick={() => setMaxPrice(value)} key={label}>{label}</FilterChip>)}
            </div>
          </fieldset>
          <fieldset>
            <legend>Product filters</legend>
            <div className="filter-chip-row">
              <FilterChip active={features.bestSeller} onClick={() => toggleFeature("bestSeller")}>Best Seller</FilterChip>
              <FilterChip active={features.newArrival} onClick={() => toggleFeature("newArrival")}>New Arrival</FilterChip>
              <FilterChip active={features.organic} disabled={!availability.organic} onClick={() => toggleFeature("organic")}>Organic</FilterChip>
              <FilterChip active={features.inStock} disabled={!availability.inStock} onClick={() => toggleFeature("inStock")}>In Stock</FilterChip>
              <FilterChip active={features.discount} disabled={!availability.discount} onClick={() => toggleFeature("discount")}>Discount</FilterChip>
            </div>
          </fieldset>
          <fieldset>
            <legend>Rating</legend>
            <div className="filter-chip-row">
              <FilterChip active={minimumRating === 0} onClick={() => setMinimumRating(0)}>Any rating</FilterChip>
              <FilterChip active={minimumRating === 4} onClick={() => setMinimumRating(4)}>4★ &amp; up</FilterChip>
              <FilterChip active={minimumRating === 4.5} onClick={() => setMinimumRating(4.5)}>4.5★ &amp; up</FilterChip>
            </div>
          </fieldset>
          <fieldset>
            <legend>Sort by</legend>
            <div className="filter-chip-row">
              {sortFilters.map(([value, label]) => <FilterChip active={sort === value} onClick={() => setSort(value)} key={value}>{label}</FilterChip>)}
            </div>
          </fieldset>
        </div>
        <div className="filter-bar filter-bar--catalog">
          <div><span className="eyebrow">Shop the collection</span><h2 id="shop-heading">{active === "all" ? "All products" : categories.find((item) => item.id === active)?.name}</h2></div>
        </div>
        {visible.length ? (
          <div className="product-grid">{visible.map((item, index) => <ProductCard item={item} key={item.slug} priority={index < 4} />)}</div>
        ) : (
          <div className="empty-results"><Search size={28} /><h3>No products found</h3><p>Try another search or broaden your filters.</p><button type="button" onClick={clearFilters}>Reset filters</button></div>
        )}
      </section>
    </div>
  );
}
