import { ArrowLeft, CheckCircle, Heart, Leaf, Minus, PackageCheck, Plus, ShieldCheck, ShoppingBag, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import ProductCard from "../components/storefront/ProductCard";
import ProductPackaging from "../components/storefront/ProductPackaging";
import { useCatalog } from "../contexts/CatalogContext";
import { useCommerce } from "../contexts/CommerceContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { useSiteContent } from "../contexts/SiteContentContext";

const reviews = [
  { name: "Ananya S.", date: "12 July 2026", rating: 5, title: "Beautiful quality and presentation", copy: "Fresh, thoughtfully packed and exactly the kind of premium pantry product I was hoping for." },
  { name: "Rohan M.", date: "28 June 2026", rating: 4, title: "Clean flavour, lovely pack", copy: "The resealable pouch is excellent and the ingredients feel carefully selected. A very polished experience." },
];

export default function ProductPage() {
  const { slug } = useParams();
  const { categoryById, productBySlug, products, loading } = useCatalog();
  const { get } = useSiteContent();
  const { addToCart, toggleWishlist, wishlist } = useCommerce();
  const item = productBySlug[slug];
  const managed = get("product_content", slug)?.content || {};
  const [variantSelection, setVariantSelection] = useState({ slug, value: item?.variants[0] || "" });
  const [quantitySelection, setQuantitySelection] = useState({ slug, value: 1 });
  const selectedVariant = variantSelection.slug === slug ? variantSelection.value : item?.variants[0] || "";
  const quantity = quantitySelection.slug === slug ? quantitySelection.value : 1;
  useDocumentTitle(
    item?.name || "Product",
    item ? `${item.note}. Ingredients: ${item.ingredients}. Available in ${item.variants.join(", ")}.` : undefined,
  );

  useEffect(() => {
    if (!item) return;
    const stored = JSON.parse(window.localStorage.getItem("kg-recently-viewed") || "[]");
    const next = [item.slug, ...stored.filter((value) => value !== item.slug)].slice(0, 5);
    window.localStorage.setItem("kg-recently-viewed", JSON.stringify(next));
  }, [item]);

  const recentlyViewed = useMemo(() => {
    if (!item) return [];
    const stored = JSON.parse(window.localStorage.getItem("kg-recently-viewed") || "[]");
    return stored.filter((value) => value !== item.slug).map((value) => productBySlug[value]).filter(Boolean).slice(0, 4);
  }, [item, productBySlug]);

  const selectedPrice = useMemo(() => {
    if (!item) return 0;
    const variant = item.variantDetails[selectedVariant];
    return Number(variant?.festival_price_paise || variant?.price_paise || 0) / 100;
  }, [item, selectedVariant]);

  if (loading) return <div className="commerce-empty">Loading product…</div>;
  if (!item) return <Navigate replace to="/shop" />;
  const relationProducts = (values = []) => values.map((value) => productBySlug[value] || products.find((product) => product.id === value)).filter(Boolean);
  const related = managed.relatedProductIds?.length ? relationProducts(managed.relatedProductIds) : products.filter((product) => product.category === item.category && product.slug !== item.slug).slice(0, 4);
  const crossSell = relationProducts(managed.crossSellProductIds);
  const upsell = relationProducts(managed.upsellProductIds);

  return (
    <div className="page-shell product-page">
      <Link className="back-link" to="/shop"><ArrowLeft size={16} /> Back to shop</Link>
      <section className="product-detail">
        <div className="product-detail__media">
          {item.badge ? <span className={`product-badge product-badge--${item.badge === "New" ? "new" : "best"}`}>{item.badge}</span> : null}
          <ProductPackaging item={item} variant={selectedVariant} priority size="detail" />
        </div>
        <div className="product-detail__copy">
          <p className="eyebrow">{categoryById[item.category].name}</p>
          <h1>{item.name}</h1>
          <a className="detail-rating" href="#customer-reviews" aria-label={`${item.rating} out of 5 stars from ${item.reviewCount} reviews`}>
            <span>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} fill="currentColor" />)}</span>
            <strong>{item.rating}</strong><span>{item.reviewCount} reviews</span>
          </a>
          <p className="product-detail__price">₹{selectedPrice.toLocaleString("en-IN")} <small>inclusive of taxes</small></p>
          <p className="product-detail__lead">{managed.description || item.description || item.note}</p>
          <div className="detail-block">
            <span className="detail-label">{item.category === "gifts" ? "Choose format" : "Choose pack size"}</span>
            <div className="size-selector">
              {item.variants.map((variant) => <button aria-pressed={selectedVariant === variant} className={selectedVariant === variant ? "is-active" : ""} key={variant} onClick={() => setVariantSelection({ slug, value: variant })} type="button">{variant}</button>)}
            </div>
          </div>
          <div className="detail-block detail-block--quantity">
            <span className="detail-label">Quantity</span>
            <div className="quantity-selector">
              <button type="button" onClick={() => setQuantitySelection({ slug, value: Math.max(1, quantity - 1) })} aria-label="Decrease quantity"><Minus size={15} /></button>
              <output aria-live="polite">{quantity}</output>
              <button type="button" onClick={() => setQuantitySelection({ slug, value: Math.min(10, quantity + 1) })} aria-label="Increase quantity"><Plus size={15} /></button>
            </div>
          </div>
          {managed.ingredients || item.ingredients ? <div className="detail-block"><span className="detail-label">Ingredients</span><p>{managed.ingredients || item.ingredients}</p></div> : null}
          {managed.nutrition ? <div className="detail-block"><span className="detail-label">Nutrition</span><p>{managed.nutrition}</p></div> : null}
          {(managed.benefits || []).length ? <div className="detail-block"><span className="detail-label">Benefits</span><ul>{managed.benefits.map((benefit)=><li key={benefit}>{benefit}</li>)}</ul></div> : null}
          <div className="product-promises">
            <span><Leaf size={18} /> Thoughtfully sourced</span><span><PackageCheck size={18} /> Resealable pack</span><span><ShieldCheck size={18} /> Quality selected</span>
          </div>
          <div className="product-actions">
            <button type="button" onClick={() => addToCart(item, selectedVariant, quantity)}><ShoppingBag size={17} /> Add to cart</button>
            <button className={wishlist.includes(item.slug) ? "is-active" : ""} type="button" onClick={() => toggleWishlist(item.slug)} aria-label={wishlist.includes(item.slug) ? `Remove ${item.name} from wishlist` : `Add ${item.name} to wishlist`}><Heart size={17} fill={wishlist.includes(item.slug) ? "currentColor" : "none"} /></button>
          </div>
        </div>
      </section>
      {(managed.specifications || []).length ? <section className="cms-product-content"><h2>Specifications</h2><dl>{managed.specifications.map((spec)=><div key={spec.label}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>)}</dl></section> : null}
      {(managed.faqs || []).length ? <section className="cms-product-content"><h2>Product FAQs</h2>{managed.faqs.map((faq)=><details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</section> : null}
      <section className="reviews-section" id="customer-reviews">
        <div className="reviews-summary">
          <p className="eyebrow">Customer reviews</p><h2>Loved in everyday rituals</h2>
          <div><strong>{item.rating}</strong><span>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={17} fill="currentColor" />)}<small>Based on {item.reviewCount} reviews</small></span></div>
          <p>Review examples are displayed for storefront presentation.</p>
        </div>
        <div className="review-list">
          {reviews.map((review) => (
            <article key={review.name}><div><span>{Array.from({ length: review.rating }, (_, index) => <Star key={index} size={13} fill="currentColor" />)}</span><small>{review.date}</small></div><h3>{review.title}</h3><p>{review.copy}</p><footer><CheckCircle size={14} /> Verified customer · {review.name}</footer></article>
          ))}
        </div>
      </section>
      {related.length > 0 && <section className="related-products"><div className="section-heading"><p className="eyebrow">Related products</p><h2>More from {categoryById[item.category].name}</h2></div><div className="product-grid">{related.map((product) => <ProductCard item={product} key={product.slug} />)}</div></section>}
      {crossSell.length > 0 && <section className="related-products"><div className="section-heading"><p className="eyebrow">Pairs well with</p><h2>Complete your pantry</h2></div><div className="product-grid">{crossSell.map((product) => <ProductCard item={product} key={product.slug} />)}</div></section>}
      {upsell.length > 0 && <section className="related-products"><div className="section-heading"><p className="eyebrow">You may also like</p><h2>Premium selections</h2></div><div className="product-grid">{upsell.map((product) => <ProductCard item={product} key={product.slug} />)}</div></section>}
      {recentlyViewed.length > 0 && <section className="recent-products"><div className="section-heading"><p className="eyebrow">Recently viewed</p><h2>Continue exploring</h2></div><div className="product-grid">{recentlyViewed.map((product) => <ProductCard item={product} key={product.slug} />)}</div></section>}
    </div>
  );
}
