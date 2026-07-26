import { ArrowUpRight, Heart, Plus, Star } from "lucide-react";
import { Link } from "react-router-dom";

import { categoryById } from "../../data/catalog";
import { useCommerce } from "../../contexts/CommerceContext";

export default function ProductCard({ item, priority = false }) {
  const { addToCart, moveWishlistToCart, toggleWishlist, wishlist } = useCommerce();
  const wished = wishlist.includes(item.slug);
  return (
    <article className="product-card">
      <div className="product-card__media-wrap">
        <Link className="product-card__media" to={`/shop/${item.slug}`} aria-label={`View ${item.name}`}>
        {item.badge ? <span className={`product-badge product-badge--${item.badge === "New" ? "new" : "best"}`}>{item.badge}</span> : null}
          <img
            alt={`${item.name} in Kisan Gaurav premium green and cream packaging`}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            loading={priority ? "eager" : "lazy"}
            src={item.image}
            width="1200"
            height="1200"
          />
          <span className="product-card__view">
            View product <ArrowUpRight size={15} aria-hidden="true" />
          </span>
        </Link>
        <button className={`wishlist-button ${wished ? "is-active" : ""}`} type="button" onClick={() => toggleWishlist(item.slug)} aria-label={wished ? `Remove ${item.name} from wishlist` : `Add ${item.name} to wishlist`}><Heart size={16} fill={wished ? "currentColor" : "none"} /></button>
      </div>
      <div className="product-card__body">
        <p className="product-card__category">{categoryById[item.category].name}</p>
        <h3><Link to={`/shop/${item.slug}`}>{item.name}</Link></h3>
        <div className="product-card__rating" aria-label={`${item.rating} out of 5 stars, ${item.reviewCount} reviews`}>
          <Star size={13} fill="currentColor" aria-hidden="true" /><strong>{item.rating}</strong><span>({item.reviewCount})</span>
        </div>
        <p className="product-card__note">{item.note}</p>
        <div className="product-card__footer">
          <div><small>From</small><strong>₹{item.price.toLocaleString("en-IN")}</strong></div>
          <div className="product-card__sizes" aria-label="Available sizes">
            {item.variants.slice(0, 2).map((variant) => <span key={variant}>{variant}</span>)}
          </div>
        </div>
        <button className="card-add-button" type="button" onClick={() => wished ? moveWishlistToCart(item) : addToCart(item, item.variants[0], 1)}><Plus size={14} aria-hidden="true" /> {wished ? "Move to cart" : "Add to cart"}</button>
      </div>
    </article>
  );
}
