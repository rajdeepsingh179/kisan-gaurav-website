import { ArrowLeft, Check, Heart, Minus, Plus, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import ProductBadge from "../components/products/ProductBadge";
import ProductCard from "../components/products/ProductCard";
import ProductGallery from "../components/products/ProductGallery";
import { Button, Container, Section } from "../components/ui";
import { typography } from "../design-system";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useProducts from "../hooks/useProducts";
import { cn } from "../utils/cn";
import formatCurrency from "../utils/formatCurrency";

function ProductDetailContent({ product }) {
  const { addToCart, categories, products, toggleWishlist, wishlist } = useProducts();
  const initialVariant = product.variants.find((variant) => variant.stock > 0) ?? product.variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariant.id);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId);
  const category = categories.find((item) => item.id === product.categoryId);
  const isAvailable = selectedVariant.stock > 0;
  const isWishlisted = wishlist.includes(product.id);
  const relatedProducts = products.filter((item) => item.categoryId === product.categoryId && item.id !== product.id).slice(0, 4);

  const handleAddToCart = () => {
    addToCart(product.id, selectedVariant.id, quantity);
    setAdded(true);
  };

  return (
    <>
      <Container className="py-8 sm:py-10 lg:py-14">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground-muted">
          <Link className="inline-flex min-h-11 items-center gap-2 hover:text-primary-700" to="/products"><ArrowLeft aria-hidden="true" className="size-4" />Products</Link>
          <span aria-hidden="true">/</span><span>{category?.name}</span>
        </nav>

        <div className="grid min-w-0 gap-9 lg:grid-cols-2 lg:gap-14">
          <ProductGallery images={product.images} productName={product.name} />

          <div className="min-w-0 lg:py-3">
            <div className="flex flex-wrap gap-2">{product.badges.map((badge) => <ProductBadge key={badge}>{badge}</ProductBadge>)}</div>
            <p className="mt-5 text-sm font-bold uppercase tracking-[0.15em] text-primary-700">{category?.name}</p>
            <h1 className={cn(typography.heading1, "mt-2 text-foreground")}>{product.name}</h1>
            <p className={cn(typography.bodyLarge, "mt-5 text-foreground-muted")}>{product.description}</p>

            <div className="mt-6 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold tracking-tight text-foreground">{formatCurrency(selectedVariant.price)}</span>
              {selectedVariant.compareAtPrice > selectedVariant.price ? <span className="text-lg text-foreground-muted line-through">{formatCurrency(selectedVariant.compareAtPrice)}</span> : null}
              <span className="text-sm text-foreground-muted">Inclusive of taxes</span>
            </div>

            <fieldset className="mt-8">
              <legend className="text-sm font-bold text-foreground">Choose a pack size</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    aria-pressed={selectedVariantId === variant.id}
                    className={cn(
                      "min-h-11 rounded-control border px-4 text-sm font-semibold transition",
                      selectedVariantId === variant.id ? "border-primary-600 bg-primary-50 text-primary-800 shadow-soft" : "border-border bg-surface text-foreground hover:border-primary-300",
                      variant.stock === 0 && "text-neutral-400 line-through",
                    )}
                    key={variant.id}
                    onClick={() => { setSelectedVariantId(variant.id); setQuantity(1); setAdded(false); }}
                    type="button"
                  >
                    {variant.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className={cn("mt-5 flex items-center gap-2 text-sm font-bold", isAvailable ? "text-primary-700" : "text-neutral-600")}>
              <span className={cn("size-2.5 rounded-full", isAvailable ? "bg-primary-500" : "bg-neutral-400")} />
              {isAvailable ? `${selectedVariant.stock} packs in stock` : "This variant is out of stock"}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <div className="inline-grid min-h-12 grid-cols-3 overflow-hidden rounded-control border border-border bg-surface">
                <button aria-label="Decrease quantity" className="grid min-w-11 place-items-center hover:bg-primary-50" disabled={quantity <= 1} onClick={() => setQuantity((current) => Math.max(1, current - 1))} type="button"><Minus aria-hidden="true" className="size-4" /></button>
                <output aria-label="Quantity" className="grid min-w-11 place-items-center border-x border-border text-sm font-bold">{quantity}</output>
                <button aria-label="Increase quantity" className="grid min-w-11 place-items-center hover:bg-primary-50" disabled={!isAvailable || quantity >= selectedVariant.stock} onClick={() => setQuantity((current) => Math.min(selectedVariant.stock, current + 1))} type="button"><Plus aria-hidden="true" className="size-4" /></button>
              </div>
              <Button className="min-h-12 flex-1" disabled={!isAvailable} onClick={handleAddToCart} size="lg">
                {added ? <Check aria-hidden="true" className="size-5" /> : <ShoppingBag aria-hidden="true" className="size-5" />}
                {added ? `Added ${quantity} to cart` : "Add to cart"}
              </Button>
              <Button aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"} className="min-h-12 px-4" onClick={() => toggleWishlist(product.id)} size="lg" variant="secondary">
                <Heart aria-hidden="true" className={cn("size-5", isWishlisted && "fill-current text-primary-700")} />
                <span className="sm:sr-only">Wishlist</span>
              </Button>
            </div>

            <div aria-live="polite" className="min-h-7 pt-2 text-sm font-semibold text-primary-700">{added ? "Saved in your local mock cart. Checkout is not connected yet." : ""}</div>

            <div className="mt-6 grid gap-3 border-y border-border py-5 sm:grid-cols-2">
              <div className="flex gap-3"><ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary-700" /><div><p className="text-sm font-bold">Quality selected</p><p className="text-xs text-foreground-muted">Packed with care by Kisan Gaurav</p></div></div>
              <div className="flex gap-3"><Truck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary-700" /><div><p className="text-sm font-bold">Delivery-ready foundation</p><p className="text-xs text-foreground-muted">Shipping integration will be added later</p></div></div>
            </div>

            <div className="mt-7"><h2 className={cn(typography.heading3, "text-foreground")}>Product details</h2><p className="mt-3 text-sm leading-7 text-foreground-muted">{product.details}</p></div>
          </div>
        </div>
      </Container>

      {relatedProducts.length ? (
        <Section tone="muted">
          <h2 className={cn(typography.heading2, "text-foreground")}>You may also like</h2>
          <div className="mt-8 grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">{relatedProducts.map((item) => <ProductCard key={item.id} product={item} />)}</div>
        </Section>
      ) : null}
    </>
  );
}

export default function ProductDetailPage() {
  const { productSlug } = useParams();
  const { getProductBySlug } = useProducts();
  const product = getProductBySlug(productSlug);
  useDocumentTitle(product?.name ?? "Product not found");

  if (!product) return <Navigate replace to="/products" />;
  return <ProductDetailContent key={product.id} product={product} />;
}
