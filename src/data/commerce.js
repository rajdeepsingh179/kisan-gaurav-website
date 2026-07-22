import { productImages } from "./productsPage";

const packagingImage = {
  small: "/images/home/premium-packaging-720.jpg",
  smallWidth: 720,
  large: "/images/home/premium-packaging-1400.jpg",
  largeWidth: 1400,
};

const gallery = (primary, productName) => [
  { ...primary, alt: `${productName} in Kisan Gaurav packaging` },
  { ...packagingImage, alt: "Kisan Gaurav premium food packaging" },
];

export const categories = Object.freeze([
  { id: "makhana", name: "Makhana", description: "Light, crisp fox nuts for mindful snacking." },
  { id: "dry-fruits", name: "Dry Fruits", description: "Carefully selected nuts and naturally sweet dried fruits." },
  { id: "healthy-snacks", name: "Healthy Snacks", description: "Wholesome choices for work, travel, and family time." },
  { id: "gift-packs", name: "Gift Packs", description: "Premium food gifts for celebrations and teams." },
]);

export const products = Object.freeze([
  {
    id: "prod-makhana-premium",
    slug: "premium-makhana",
    name: "Premium Makhana",
    categoryId: "makhana",
    description: "Large, light and crisp fox nuts selected for wholesome everyday snacking.",
    details: "Carefully graded for size and texture, our premium makhana is packed fresh in a resealable Kisan Gaurav pouch. Enjoy it as-is or roast it with your favourite seasoning.",
    badges: ["Best Seller", "Premium"],
    images: gallery(productImages.makhana, "Premium makhana"),
    variants: [
      { id: "100-g", label: "100 g", price: 179, compareAtPrice: 199, stock: 18 },
      { id: "250-g", label: "250 g", price: 399, compareAtPrice: 449, stock: 24 },
      { id: "500-g", label: "500 g", price: 749, compareAtPrice: 849, stock: 0 },
    ],
  },
  {
    id: "prod-makhana-roasted",
    slug: "classic-roasted-makhana",
    name: "Classic Roasted Makhana",
    categoryId: "healthy-snacks",
    description: "Gently roasted makhana with a clean, satisfying crunch.",
    details: "A simple, savoury snack made for desks, school bags, and evening tea. Packed in convenient resealable formats to help retain crunch.",
    badges: ["New"],
    images: gallery(productImages.makhana, "Classic roasted makhana"),
    variants: [
      { id: "60-g", label: "60 g", price: 129, compareAtPrice: 149, stock: 32 },
      { id: "120-g", label: "120 g", price: 239, compareAtPrice: 269, stock: 15 },
    ],
  },
  {
    id: "prod-almonds-whole",
    slug: "whole-almonds",
    name: "Whole Almonds",
    categoryId: "dry-fruits",
    description: "Naturally nourishing whole almonds with a satisfying crunch.",
    details: "Selected for consistent size, flavour, and texture. A versatile pantry staple for breakfast bowls, recipes, and everyday snacking.",
    badges: ["Premium"],
    images: gallery(productImages.almonds, "Whole almonds"),
    variants: [
      { id: "250-g", label: "250 g", price: 349, compareAtPrice: 399, stock: 21 },
      { id: "500-g", label: "500 g", price: 649, compareAtPrice: 749, stock: 9 },
      { id: "1-kg", label: "1 kg", price: 1199, compareAtPrice: 1399, stock: 5 },
    ],
  },
  {
    id: "prod-cashews-premium",
    slug: "premium-cashews",
    name: "Premium Cashews",
    categoryId: "dry-fruits",
    description: "Creamy whole cashews chosen for snacks, recipes, and celebrations.",
    details: "Premium-grade whole cashews with a smooth bite and naturally rich flavour, sealed in protective packaging for dependable freshness.",
    badges: ["New", "Premium"],
    images: gallery(productImages.cashews, "Premium cashews"),
    variants: [
      { id: "250-g", label: "250 g", price: 399, compareAtPrice: 449, stock: 16 },
      { id: "500-g", label: "500 g", price: 749, compareAtPrice: 849, stock: 7 },
    ],
  },
  {
    id: "prod-signature-mix",
    slug: "signature-dry-fruit-mix",
    name: "Signature Dry Fruit Mix",
    categoryId: "healthy-snacks",
    description: "A balanced mix of almonds, walnuts, pistachios, and golden raisins.",
    details: "A colourful, satisfying mix portioned for everyday nourishment, entertaining, and travel. No complicated preparation—just open and enjoy.",
    badges: ["Best Seller"],
    images: gallery(productImages.premiumMix, "Signature dry fruit mix"),
    variants: [
      { id: "200-g", label: "200 g", price: 429, compareAtPrice: 479, stock: 14 },
      { id: "400-g", label: "400 g", price: 799, compareAtPrice: 899, stock: 8 },
    ],
  },
  {
    id: "prod-festive-gift",
    slug: "festive-dry-fruit-gift-pack",
    name: "Festive Dry Fruit Gift Pack",
    categoryId: "gift-packs",
    description: "An elegant assortment created for celebrations and thoughtful gifting.",
    details: "A refined Kisan Gaurav presentation box with premium selections arranged for festive, family, and professional occasions.",
    badges: ["Premium"],
    images: gallery(packagingImage, "Festive dry fruit gift pack"),
    variants: [
      { id: "classic", label: "Classic box", price: 999, compareAtPrice: 1199, stock: 10 },
      { id: "grand", label: "Grand box", price: 1599, compareAtPrice: 1899, stock: 4 },
    ],
  },
  {
    id: "prod-almond-trail-mix",
    slug: "almond-trail-mix",
    name: "Almond Trail Mix",
    categoryId: "healthy-snacks",
    description: "A convenient nut-and-fruit blend for active days and travel.",
    details: "A portable blend led by whole almonds with complementary nuts and dried fruit, designed for portion-friendly snacking on the move.",
    badges: ["New"],
    images: gallery(productImages.premiumMix, "Almond trail mix"),
    variants: [
      { id: "150-g", label: "150 g", price: 299, compareAtPrice: 349, stock: 20 },
      { id: "300-g", label: "300 g", price: 549, compareAtPrice: 629, stock: 11 },
    ],
  },
  {
    id: "prod-corporate-gift",
    slug: "corporate-premium-gift-box",
    name: "Corporate Premium Gift Box",
    categoryId: "gift-packs",
    description: "A polished assortment for teams, partners, and important occasions.",
    details: "A premium multi-product gift concept designed for future corporate orders. This mock item demonstrates unavailable inventory states.",
    badges: ["Premium", "Out of Stock"],
    images: gallery(packagingImage, "Corporate premium gift box"),
    variants: [
      { id: "standard", label: "Standard", price: 1499, compareAtPrice: 1699, stock: 0 },
      { id: "signature", label: "Signature", price: 2299, compareAtPrice: 2599, stock: 0 },
    ],
  },
]);

export const mockOrders = Object.freeze([
  {
    id: "KG-MOCK-1001",
    placedAt: "2026-07-18",
    status: "Delivered",
    total: 778,
    items: [
      { productId: "prod-makhana-premium", variantId: "250-g", quantity: 1 },
      { productId: "prod-almonds-whole", variantId: "250-g", quantity: 1 },
    ],
  },
]);

export const productBadgeNames = Object.freeze(["Best Seller", "New", "Premium", "Out of Stock"]);
