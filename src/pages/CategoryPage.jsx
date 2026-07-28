import { ArrowLeft } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";

import ProductCard from "../components/storefront/ProductCard";
import { useCatalog } from "../contexts/CatalogContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { useSiteContent } from "../contexts/SiteContentContext";

export default function CategoryPage() {
  const { categoryById, products, loading } = useCatalog();
  const { get } = useSiteContent();
  const { categoryId } = useParams();
  const category = categoryById[categoryId];
  const managed = get("category_content", categoryId)?.content || {};
  useDocumentTitle(managed.name || category?.name || "Category", managed.description || category?.description);
  if (loading) return <div className="commerce-empty">Loading collection…</div>;
  if (!category) return <Navigate replace to="/categories" />;
  const items = products.filter((item) => item.category === category.id);

  return (
    <div className="page-shell">
      <section className="category-page-hero">
        <div>
          <Link to="/categories"><ArrowLeft size={15} /> All categories</Link>
          <p className="eyebrow">{managed.eyebrow || category.eyebrow}</p>
          <h1>{managed.name || category.name}</h1>
          <p>{managed.description || category.description}</p>
        </div>
        <img src={managed.heroBanner || category.heroImage} width="2000" height="1600" alt={`${managed.name || category.name} collection`} decoding="async" fetchPriority="high" />
      </section>
      <section className="catalog-section">
        <div className="section-heading section-heading--split">
          <div><p className="eyebrow">Explore the collection</p><h2>{items.length} considered choices</h2></div>
          <Link className="text-link" to={`/shop?category=${category.id}`}>Search and filter</Link>
        </div>
        <div className="product-grid">{items.map((item) => <ProductCard item={item} key={item.slug} />)}</div>
      </section>
    </div>
  );
}
