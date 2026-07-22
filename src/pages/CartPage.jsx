import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import { Button, Card, Section } from "../components/ui";
import { typography } from "../design-system";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useProducts from "../hooks/useProducts";
import { cn } from "../utils/cn";
import formatCurrency from "../utils/formatCurrency";

export default function CartPage() {
  const { cart, cartTotal, products, removeFromCart, updateCartQuantity } = useProducts();
  useDocumentTitle("Cart");
  const cartItems = cart.map((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    const variant = product?.variants.find((entry) => entry.id === item.variantId);
    return { ...item, product, variant };
  }).filter((item) => item.product && item.variant);

  return (
    <Section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary-700">Kisan Gaurav Foods</p><h1 className={cn(typography.heading1, "mt-2")}>Your cart</h1></div>
        <Button as={Link} to="/products" variant="secondary">Continue shopping</Button>
      </div>
      {cartItems.length ? (
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-4">
            {cartItems.map((item) => (
              <Card className="flex flex-col gap-4 sm:flex-row sm:items-center" key={`${item.productId}-${item.variantId}`} padding="sm">
                <img alt="" className="size-24 rounded-control object-cover" height="96" src={item.product.images[0].small} width="96" />
                <div className="min-w-0 flex-1"><Link className="font-bold hover:text-primary-700" to={`/products/${item.product.slug}`}>{item.product.name}</Link><p className="mt-1 text-sm text-foreground-muted">{item.variant.label} • {formatCurrency(item.variant.price)}</p></div>
                <div className="inline-grid min-h-11 grid-cols-3 overflow-hidden rounded-control border border-border">
                  <button aria-label="Decrease quantity" className="grid size-11 place-items-center" onClick={() => updateCartQuantity(item.productId, item.variantId, item.quantity - 1)} type="button"><Minus aria-hidden="true" className="size-4" /></button>
                  <span className="grid size-11 place-items-center border-x border-border text-sm font-bold">{item.quantity}</span>
                  <button aria-label="Increase quantity" className="grid size-11 place-items-center" onClick={() => updateCartQuantity(item.productId, item.variantId, item.quantity + 1)} type="button"><Plus aria-hidden="true" className="size-4" /></button>
                </div>
                <button aria-label={`Remove ${item.product.name}`} className="grid size-11 place-items-center rounded-control text-foreground-muted hover:bg-primary-50 hover:text-primary-700" onClick={() => removeFromCart(item.productId, item.variantId)} type="button"><Trash2 aria-hidden="true" className="size-4" /></button>
              </Card>
            ))}
          </div>
          <Card className="h-fit lg:sticky lg:top-24" elevated>
            <h2 className={cn(typography.heading3, "text-foreground")}>Order summary</h2>
            <div className="mt-5 flex justify-between border-t border-border pt-5"><span className="text-foreground-muted">Subtotal</span><strong>{formatCurrency(cartTotal)}</strong></div>
            <p className="mt-4 text-xs leading-5 text-foreground-muted">Checkout and payments are not connected yet.</p>
            <Button className="mt-5 w-full" disabled>Checkout coming soon</Button>
          </Card>
        </div>
      ) : (
        <Card className="mt-10 py-14 text-center" padding="lg"><ShoppingBag aria-hidden="true" className="mx-auto size-10 text-primary-600" /><h2 className={cn(typography.heading3, "mt-4")}>Your cart is empty</h2><p className="mt-2 text-sm text-foreground-muted">Explore our premium makhana, dry fruits, snacks, and gift packs.</p><Button as={Link} className="mt-6" to="/products">Shop products</Button></Card>
      )}
    </Section>
  );
}
