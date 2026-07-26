import { ArrowRight, Leaf, PackageCheck, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import ProductCard from "../components/storefront/ProductCard";
import { categories, products } from "../data/catalog";
import useDocumentTitle from "../hooks/useDocumentTitle";

const categoryImages = {
  makhana: "/images/storefront/classic-makhana-card.webp",
  almonds: "/images/storefront/whole-almonds-card.webp",
  cashews: "/images/storefront/premium-cashews-card.webp",
  mixtures: "/images/storefront/signature-mix-card.webp",
  walnuts: "/images/storefront/premium-walnuts-card.webp",
  gifts: "/images/storefront/premium-gift-box-card.webp",
};

export default function HomePage() {
  useDocumentTitle("Premium Dry Fruits & Thoughtful Gifting");
  const featured = products.filter((item) => item.featured).slice(0, 8);

  return (
    <>
      <section className="store-hero">
        <img className="store-hero__image" src="/images/storefront/hero-2000.webp" width="2000" height="1600" alt="Kisan Gaurav almond, cashew and makhana pantry packs" fetchPriority="high" />
        <div className="store-hero__shade" />
        <div className="store-hero__copy">
          <p className="eyebrow eyebrow--light">Premium foods · Thoughtfully sourced</p>
          <h1>Goodness,<br /><em>grown with pride.</em></h1>
          <p>Exceptional dry fruits, mindful blends and gifts made to honour the goodness of India’s harvests.</p>
          <div className="hero-actions">
            <Link className="button button--cream" to="/shop">Explore the collection <ArrowRight size={17} /></Link>
            <Link className="text-link text-link--light" to="/about">Our story</Link>
          </div>
        </div>
        <div className="store-hero__stamp"><Leaf size={18} /><span>Rooted in<br />Indian goodness</span></div>
      </section>
      <section className="marquee" aria-label="Brand promises"><div><span>Thoughtfully sourced</span><i>✦</i><span>Premium pantry staples</span><i>✦</i><span>Made for modern rituals</span><i>✦</i><span>Gift wellness beautifully</span></div></section>
      <section className="home-section home-section--intro">
        <div className="section-heading section-heading--split">
          <div><p className="eyebrow">Shop by collection</p><h2>A pantry of<br /><em>considered choices.</em></h2></div>
          <p>From a crisp afternoon handful to a generous festive gesture, find naturally satisfying food for every kind of moment.</p>
        </div>
        <div className="category-grid">
          {categories.map((category, index) => (
            <Link className="category-card" key={category.id} to={`/category/${category.id}`}>
              <img src={categoryImages[category.id]} width="1200" height="1200" loading="lazy" decoding="async" alt="" />
              <div className="category-card__overlay" />
              <span className="category-card__number">{String(index + 1).padStart(2, "0")}</span>
              <div><p>{category.eyebrow}</p><h3>{category.name}</h3><span>Discover <ArrowRight size={16} /></span></div>
            </Link>
          ))}
        </div>
      </section>
      <section className="home-section home-section--green">
        <div className="section-heading section-heading--split section-heading--light">
          <div><p className="eyebrow eyebrow--light">The edit</p><h2>Made for your<br /><em>everyday rituals.</em></h2></div>
          <Link className="text-link text-link--light" to="/shop">View all products <ArrowRight size={16} /></Link>
        </div>
        <div className="product-grid">{featured.map((item) => <ProductCard item={item} key={item.slug} />)}</div>
      </section>
      <section className="origin-section">
        <div className="origin-section__mark">किसान</div>
        <div className="origin-section__copy">
          <p className="eyebrow">Why Kisan Gaurav</p><h2>Because every good thing<br /><em>begins at the source.</em></h2>
          <p>Our name means “the pride of the farmer.” It reminds us to look beyond the pack—to the soil, skill and patient care behind every ingredient.</p>
          <Link className="text-link" to="/about">Read our story <ArrowRight size={16} /></Link>
        </div>
        <div className="promise-list">
          <div><Leaf /><span><strong>Thoughtfully sourced</strong><small>Ingredients chosen with care</small></span></div>
          <div><ShieldCheck /><span><strong>Quality selected</strong><small>Clean taste and natural texture</small></span></div>
          <div><PackageCheck /><span><strong>Freshness considered</strong><small>Resealable premium packaging</small></span></div>
          <div><Sparkles /><span><strong>Beautifully giftable</strong><small>Quiet luxury for every occasion</small></span></div>
        </div>
      </section>
      <section className="gifting-banner">
        <div><p className="eyebrow eyebrow--light">The art of thoughtful gifting</p><h2>Give something<br /><em>genuinely good.</em></h2><p>Curated dry-fruit collections for families, festivities, weddings and meaningful corporate moments.</p><Link className="button button--cream" to="/category/gifts">Explore gift packs <ArrowRight size={17} /></Link></div>
        <img src="/images/storefront/premium-gift-box-detail.webp" width="1800" height="1800" loading="lazy" alt="Premium Kisan Gaurav dry fruit gift box" />
      </section>
    </>
  );
}
