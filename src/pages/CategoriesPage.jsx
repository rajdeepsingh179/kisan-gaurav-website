import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import ProductCard from "../components/storefront/ProductCard";
import { categories, products } from "../data/catalog";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function CategoriesPage() {
  useDocumentTitle("Categories");
  return (
    <div className="page-shell">
      <section className="page-hero page-hero--compact">
        <p className="eyebrow">Six considered collections</p>
        <h1>Find your kind of<br /><em>everyday goodness.</em></h1>
      </section>
      {categories.map((category) => {
        const categoryProducts = products.filter((item) => item.category === category.id);
        return (
          <section className="category-row" id={category.id} key={category.id}>
            <div className="category-row__head">
              <div>
                <span>{String(categories.indexOf(category) + 1).padStart(2, "0")}</span>
                <p className="eyebrow">{category.eyebrow}</p>
                <h2>{category.name}</h2>
                <p>{category.description}</p>
              </div>
              <Link to={`/category/${category.id}`}>View collection <ArrowRight size={17} /></Link>
            </div>
            <div className="product-rail">
              {categoryProducts.map((item) => <ProductCard item={item} key={item.slug} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
