import { ArrowRight, Heart, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";

import { typography } from "../../design-system";
import useProducts from "../../hooks/useProducts";
import { cn } from "../../utils/cn";
import formatCurrency from "../../utils/formatCurrency";
import { Button, Card } from "../ui";
import ProductBadge from "./ProductBadge";

export default function ProductCard({ product }) {
  const { addToCart, toggleWishlist, wishlist } = useProducts();
  const availableVariant = product.variants.find((variant) => variant.stock > 0);
  const displayVariant = availableVariant ?? product.variants[0];
  const isAvailable = Boolean(availableVariant);
  const isWishlisted = wishlist.includes(product.id);

  return (
    <Card as="article" className="group flex h-full min-w-0 flex-col overflow-hidden transition duration-300 ease-out hover:-translate-y-1 hover:border-primary-200 hover:shadow-lifted" padding="none">
      <div className="relative aspect-square overflow-hidden bg-primary-50">
        <Link aria-label={`View ${product.name}`} className="block h-full" to={`/products/${product.slug}`}>
          <img
            alt={product.images[0].alt}
            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
            decoding="async"
            height={product.images[0].largeWidth}
            loading="lazy"
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
            src={product.images[0].large}
            srcSet={`${product.images[0].small} ${product.images[0].smallWidth}w, ${product.images[0].large} ${product.images[0].largeWidth}w`}
            width={product.images[0].largeWidth}
          />
        </Link>
        <div className="absolute left-3 top-3 flex max-w-[calc(100%-4.5rem)] flex-wrap gap-1.5">
          {product.badges.map((badge) => <ProductBadge key={badge}>{badge}</ProductBadge>)}
        </div>
        <button
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={isWishlisted}
          className={cn(
            "absolute right-3 top-3 grid size-11 place-items-center rounded-full border bg-surface/95 shadow-soft backdrop-blur transition",
            isWishlisted ? "border-primary-300 text-primary-700" : "border-border text-foreground-muted hover:text-primary-700",
          )}
          onClick={() => toggleWishlist(product.id)}
          type="button"
        >
          <Heart aria-hidden="true" className={cn("size-5", isWishlisted && "fill-current")} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.13em] text-primary-700">{displayVariant.label}</p>
        <h3 className={cn(typography.heading3, "mt-2 text-foreground")}>
          <Link className="hover:text-primary-700" to={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        <p className={cn(typography.bodySmall, "mt-2.5 flex-1 text-foreground-muted")}>{product.description}</p>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-lg font-bold text-foreground">{formatCurrency(displayVariant.price)}</span>
          {displayVariant.compareAtPrice > displayVariant.price ? (
            <span className="text-sm text-foreground-muted line-through">{formatCurrency(displayVariant.compareAtPrice)}</span>
          ) : null}
        </div>
        <p className={cn("mt-1 text-xs font-semibold", isAvailable ? "text-primary-700" : "text-neutral-600")}>
          {isAvailable ? "In stock" : "Currently out of stock"}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2 border-t border-border pt-4">
          <Button as={Link} className="px-3" size="sm" to={`/products/${product.slug}`} variant="secondary">
            Details <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
          <Button aria-label={`Add ${product.name} to cart`} className="px-3" disabled={!isAvailable} onClick={() => addToCart(product.id, availableVariant?.id)} size="sm">
            <ShoppingBag aria-hidden="true" className="size-4" /> Add
          </Button>
        </div>
      </div>
    </Card>
  );
}
