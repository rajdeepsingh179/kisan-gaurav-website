import { ArrowRight, Leaf, PackageCheck, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import ProductCard from "../components/storefront/ProductCard";
import { useCatalog } from "../contexts/CatalogContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { useSiteContent } from "../contexts/SiteContentContext";

const categoryImages = {
  makhana: "/images/storefront/classic-makhana-card.webp",
  almonds: "/images/storefront/whole-almonds-card.webp",
  cashews: "/images/storefront/premium-cashews-card.webp",
  mixtures: "/images/storefront/signature-mix-card.webp",
  walnuts: "/images/storefront/premium-walnuts-card.webp",
  gifts: "/images/storefront/premium-gift-box-card.webp",
};

export default function HomePage() {
  const { categories, products } = useCatalog();
  const { get } = useSiteContent();
  const hero = get("home", "hero")?.content || {};
  const categorySection = get("home", "featured-categories")?.content || {};
  const featuredSection = get("home", "featured-products")?.content || {};
  const why = get("home", "why-choose-us")?.content || {};
  const marquee = get("home", "marquee")?.content || {};
  const statistics = get("home", "statistics")?.content || {};
  const testimonials = get("home", "testimonials")?.content || {};
  const partners = get("home", "partner-logos")?.content || {};
  const gallery = get("home", "gallery")?.content || {};
  const newsletter = get("home", "newsletter")?.content || {};
  const gifting = get("home", "gifting")?.content || {};
  const best = products.filter((item) => item.best_seller).slice(0, 8);
  const newest = products.filter((item) => item.new_arrival).slice(0, 8);
  useDocumentTitle("Premium Dry Fruits & Thoughtful Gifting");
  const featured = products.filter((item) => item.featured).slice(0, 8);

  return (
    <>
      <section className="store-hero">
        {hero.backgroundImage ? <img className="store-hero__image" src={hero.backgroundImage} width="2000" height="1600" alt={hero.heading || ""} fetchPriority="high" /> : null}
        <div className="store-hero__shade" />
        <div className="store-hero__copy">
          <p className="eyebrow eyebrow--light">{hero.eyebrow}</p>
          <h1>{hero.heading}</h1>
          <p>{hero.subheading}</p>
          <div className="hero-actions">
            {hero.primaryCta?.url ? <Link className="button button--cream" to={hero.primaryCta.url}>{hero.primaryCta.label} <ArrowRight size={17} /></Link> : null}
            {hero.secondaryCta?.url ? <Link className="text-link text-link--light" to={hero.secondaryCta.url}>{hero.secondaryCta.label}</Link> : null}
          </div>
        </div>
        {hero.badge ? <div className="store-hero__stamp"><Leaf size={18} /><span>{hero.badge}</span></div> : null}
      </section>
      {(marquee.items || []).length ? <section className="marquee" aria-label={get("home","marquee")?.title}><div>{marquee.items.map((item)=><span key={item}>{item}<i>✦</i></span>)}</div></section> : null}
      <section className="home-section home-section--intro">
        <div className="section-heading section-heading--split">
          <div><p className="eyebrow">{categorySection.eyebrow}</p><h2>{categorySection.heading}</h2></div>
          <p>{categorySection.description}</p>
        </div>
        <div className="category-grid">
          {categories.filter((category)=>category.featured).map((category, index) => (
            <Link className="category-card" key={category.id} to={`/category/${category.id}`}>
              <img src={category.thumbnail_url || category.heroImage || categoryImages[category.id]} width="1200" height="1200" loading="lazy" decoding="async" alt="" />
              <div className="category-card__overlay" />
              <span className="category-card__number">{String(index + 1).padStart(2, "0")}</span>
              <div><p>{category.eyebrow}</p><h3>{category.name}</h3><span>Discover <ArrowRight size={16} /></span></div>
            </Link>
          ))}
        </div>
      </section>
      <section className="home-section home-section--green">
        <div className="section-heading section-heading--split section-heading--light">
          <div><p className="eyebrow eyebrow--light">{featuredSection.eyebrow}</p><h2>{featuredSection.heading}</h2></div>
          <Link className="text-link text-link--light" to="/shop">View all products <ArrowRight size={16} /></Link>
        </div>
        <div className="product-grid">{featured.map((item) => <ProductCard item={item} key={item.slug} />)}</div>
      </section>
      <section className="origin-section">
        <div className="origin-section__mark">{why.mark}</div>
        <div className="origin-section__copy">
          <p className="eyebrow">{why.eyebrow}</p><h2>{why.heading}</h2>
          <p>{why.body}</p>
          {why.cta?.url?<Link className="text-link" to={why.cta.url}>{why.cta.label} <ArrowRight size={16} /></Link>:null}
        </div>
        <div className="promise-list">
          {(why.items || []).map((item, index) => { const Icon = [Leaf, ShieldCheck, PackageCheck, Sparkles][index % 4]; return <div key={item.title}><Icon /><span><strong>{item.title}</strong><small>{item.text}</small></span></div>; })}
        </div>
      </section>
      {best.length ? <section className="home-section"><div className="section-heading"><p className="eyebrow">{get("home","best-sellers")?.title}</p><h2>{get("home","best-sellers")?.content.heading}</h2></div><div className="product-grid">{best.map((item)=><ProductCard item={item} key={item.slug}/>)}</div></section>:null}
      {newest.length ? <section className="home-section home-section--green"><div className="section-heading section-heading--light"><p className="eyebrow eyebrow--light">{get("home","new-arrivals")?.title}</p><h2>{get("home","new-arrivals")?.content.heading}</h2></div><div className="product-grid">{newest.map((item)=><ProductCard item={item} key={item.slug}/>)}</div></section>:null}
      {(statistics.items||[]).length?<section className="cms-statistics">{statistics.items.map((item)=><div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}</section>:null}
      {(testimonials.items||[]).length?<section className="home-section"><div className="section-heading"><h2>{get("home","testimonials")?.title}</h2></div><div className="cms-testimonials">{testimonials.items.map((item)=><blockquote key={`${item.name}-${item.quote}`}><p>{item.quote}</p><footer>{item.name}</footer></blockquote>)}</div></section>:null}
      {(partners.items||[]).length?<section className="cms-partners" aria-label={get("home","partner-logos")?.title}>{partners.items.map((item)=><img src={item.image||item.url} alt={item.name||""} key={item.image||item.url}/>)}</section>:null}
      {(gallery.items||[]).length?<section className="cms-home-gallery">{gallery.items.map((item)=><img src={item.image||item.url||item} alt={item.alt||""} key={item.image||item.url||item}/>)}</section>:null}
      {gifting.heading?<section className="gifting-banner"><div><p className="eyebrow eyebrow--light">{gifting.eyebrow}</p><h2>{gifting.heading}</h2><p>{gifting.body}</p>{gifting.cta?.url?<Link className="button button--cream" to={gifting.cta.url}>{gifting.cta.label}<ArrowRight size={17}/></Link>:null}</div>{gifting.image?<img src={gifting.image} width="1800" height="1800" loading="lazy" alt={gifting.heading}/>:null}</section>:null}
      {newsletter.heading?<section className="cms-newsletter"><div><p className="eyebrow">{get("home","newsletter")?.title}</p><h2>{newsletter.heading}</h2><p>{newsletter.body}</p></div><form onSubmit={(event)=>event.preventDefault()}><label><span className="sr-only">Email address</span><input type="email" placeholder={newsletter.placeholder} required/></label><button type="submit">{newsletter.buttonLabel}</button></form></section>:null}
    </>
  );
}
