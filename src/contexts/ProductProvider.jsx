import { useEffect, useMemo, useState } from "react";

import { categories, mockOrders, products } from "../data/commerce";
import { COMMERCE_STORAGE_KEY, ProductContext } from "./productContext";

const initialFilters = {
  search: "",
  categoryId: "all",
  badge: "all",
  stockOnly: false,
  sort: "featured",
};

function getInitialCommerceState() {
  try {
    const savedState = JSON.parse(window.localStorage.getItem(COMMERCE_STORAGE_KEY));
    return {
      cart: Array.isArray(savedState?.cart) ? savedState.cart : [],
      wishlist: Array.isArray(savedState?.wishlist) ? savedState.wishlist : [],
    };
  } catch {
    return { cart: [], wishlist: [] };
  }
}

function getVariant(product, variantId) {
  return product?.variants.find((variant) => variant.id === variantId) ?? product?.variants[0];
}

export default function ProductProvider({ children }) {
  const [filters, setFilters] = useState(initialFilters);
  const [commerceState, setCommerceState] = useState(getInitialCommerceState);

  useEffect(() => {
    window.localStorage.setItem(COMMERCE_STORAGE_KEY, JSON.stringify(commerceState));
  }, [commerceState]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();
    const matches = products.filter((product) => {
      const category = categories.find((item) => item.id === product.categoryId);
      const searchableText = `${product.name} ${product.description} ${category?.name ?? ""}`.toLowerCase();
      const inStock = product.variants.some((variant) => variant.stock > 0);

      return (
        (!normalizedSearch || searchableText.includes(normalizedSearch)) &&
        (filters.categoryId === "all" || product.categoryId === filters.categoryId) &&
        (filters.badge === "all" || product.badges.includes(filters.badge)) &&
        (!filters.stockOnly || inStock)
      );
    });

    return [...matches].sort((a, b) => {
      const aPrice = Math.min(...a.variants.map((variant) => variant.price));
      const bPrice = Math.min(...b.variants.map((variant) => variant.price));
      if (filters.sort === "price-asc") return aPrice - bPrice;
      if (filters.sort === "price-desc") return bPrice - aPrice;
      if (filters.sort === "name") return a.name.localeCompare(b.name);
      return Number(b.badges.includes("Best Seller")) - Number(a.badges.includes("Best Seller"));
    });
  }, [filters]);

  const value = useMemo(() => {
    const setFilter = (name, valueToSet) => setFilters((current) => ({ ...current, [name]: valueToSet }));
    const resetFilters = () => setFilters(initialFilters);
    const getProductBySlug = (slug) => products.find((product) => product.slug === slug);
    const toggleWishlist = (productId) => {
      setCommerceState((current) => ({
        ...current,
        wishlist: current.wishlist.includes(productId)
          ? current.wishlist.filter((id) => id !== productId)
          : [...current.wishlist, productId],
      }));
    };
    const addToCart = (productId, variantId, quantity = 1) => {
      const product = products.find((item) => item.id === productId);
      const variant = getVariant(product, variantId);
      if (!variant || variant.stock <= 0) return;

      setCommerceState((current) => {
        const existingItem = current.cart.find(
          (item) => item.productId === productId && item.variantId === variant.id,
        );
        const cart = existingItem
          ? current.cart.map((item) =>
              item === existingItem
                ? { ...item, quantity: Math.min(item.quantity + quantity, variant.stock) }
                : item,
            )
          : [...current.cart, { productId, variantId: variant.id, quantity: Math.min(quantity, variant.stock) }];
        return { ...current, cart };
      });
    };
    const updateCartQuantity = (productId, variantId, quantity) => {
      const product = products.find((item) => item.id === productId);
      const variant = getVariant(product, variantId);
      setCommerceState((current) => ({
        ...current,
        cart: quantity <= 0
          ? current.cart.filter((item) => item.productId !== productId || item.variantId !== variantId)
          : current.cart.map((item) =>
              item.productId === productId && item.variantId === variantId
                ? { ...item, quantity: Math.min(quantity, variant?.stock ?? quantity) }
                : item,
            ),
      }));
    };
    const removeFromCart = (productId, variantId) => updateCartQuantity(productId, variantId, 0);
    const clearCart = () => setCommerceState((current) => ({ ...current, cart: [] }));
    const cartCount = commerceState.cart.reduce((total, item) => total + item.quantity, 0);
    const cartTotal = commerceState.cart.reduce((total, item) => {
      const product = products.find((entry) => entry.id === item.productId);
      return total + (getVariant(product, item.variantId)?.price ?? 0) * item.quantity;
    }, 0);

    return {
      products,
      categories,
      filteredProducts,
      filters,
      setFilter,
      resetFilters,
      getProductBySlug,
      cart: commerceState.cart,
      cartCount,
      cartTotal,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      clearCart,
      wishlist: commerceState.wishlist,
      toggleWishlist,
      orders: mockOrders,
    };
  }, [commerceState, filteredProducts, filters]);

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}
