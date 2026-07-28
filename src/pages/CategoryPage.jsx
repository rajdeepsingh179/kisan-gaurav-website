import { ArrowLeft } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";

import ProductCard from "../components/storefront/ProductCard";
import { useCatalog } from "../contexts/CatalogContext";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function CategoryPage() {
  const { categoryById, products, loading } = useCatalog();
  const { categoryId } = useParams();
  const category = categoryById[categoryId];
  useDocumentTitle(category?.name || "Category", category?.description);
  if (loading) return <div className="commerce-empty">Loading collection…</div>;
  if (!category) return <Navigate replace to="/categories" />;
  const items = products.filter((item) => item.category === category.id);

  return (
    <div className="page-shell">
      <section className="category-page-hero">
        <div>
          <Link to="/categories"><ArrowLeft size={15} /> All categories</Link>
          <p className="eyebrow">{category.eyebrow}</p>
          <h1>{category.name}</h1>
          <p>{category.description}</p>
        </div>
        <img src={category.heroImage} width="2000" height="1600" alt={`${category.name} collection`} decoding="async" fetchPriority="high" />
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
