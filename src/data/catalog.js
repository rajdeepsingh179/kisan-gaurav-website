export const categories = [
  {
    id: "makhana",
    name: "Premium Makhana",
    eyebrow: "Light, crisp & consciously roasted",
    description: "Hand-selected fox nuts with clean seasonings and an elegant crunch.",
  },
  {
    id: "almonds",
    name: "Almonds",
    eyebrow: "Naturally rich everyday nourishment",
    description: "Thoughtfully sourced almonds chosen for flavour, texture and freshness.",
  },
  {
    id: "cashews",
    name: "Cashews",
    eyebrow: "Creamy, delicate & beautifully whole",
    description: "Premium kernels with a naturally buttery finish.",
  },
  {
    id: "mixtures",
    name: "Dry Fruit Mixtures",
    eyebrow: "Balanced blends for every day",
    description: "Purposeful combinations of nuts and dried fruit for the whole family.",
  },
  {
    id: "walnuts",
    name: "Walnuts",
    eyebrow: "Earthy, wholesome & satisfying",
    description: "Golden walnut kernels selected for clean flavour and generous texture.",
  },
  {
    id: "gifts",
    name: "Gift Packs",
    eyebrow: "A refined way to share good health",
    description: "Considered collections for celebrations, families and thoughtful occasions.",
  },
];

const standardVariants = ["250 gm", "500 gm", "1 kg"];
const giftVariants = ["Small", "Medium", "Large"];
const basePrices = { makhana: 299, almonds: 449, cashews: 499, mixtures: 549, walnuts: 599, gifts: 999 };
const newProducts = new Set(["rasgulla-makhana", "kids-mix", "wedding-return-gift-pack"]);

const product = (slug, name, category, ingredients, note, featured = false) => ({
  slug,
  name,
  category,
  ingredients,
  note,
  featured,
  price: basePrices[category] + (slug.length % 4) * (category === "gifts" ? 250 : 50),
  rating: Number((4.5 + (slug.length % 5) / 10).toFixed(1)),
  reviewCount: 18 + (slug.length * 7) % 143,
  badge: newProducts.has(slug) ? "New" : featured ? "Best Seller" : null,
  variants: category === "gifts" ? giftVariants : standardVariants,
  image: `/images/storefront/${slug}-card.webp`,
  detailImage: `/images/storefront/${slug}-detail.webp`,
});

export const products = [
  product("classic-makhana", "Classic Makhana", "makhana", "Premium fox nuts, rock salt", "Clean, delicate crunch", true),
  product("rasgulla-makhana", "Rasgulla Makhana", "makhana", "Fox nuts, milk solids, raw sugar, cardamom", "A playful mithai-inspired finish"),
  product("black-pepper-makhana", "Black Pepper Makhana", "makhana", "Fox nuts, black pepper, rock salt", "Warm pepper, gentle heat"),
  product("cow-ghee-roasted-makhana", "Cow Ghee Roasted Makhana", "makhana", "Fox nuts, cow ghee, rock salt", "Slow roasted, deeply comforting", true),
  product("whole-almonds", "Whole Almonds", "almonds", "100% whole almonds", "Crisp, naturally sweet kernels", true),
  product("mamra-almonds", "Mamra Almonds", "almonds", "100% Mamra almonds", "Characterful shape, rich flavour"),
  product("gurbandi-almonds", "Gurbandi Almonds", "almonds", "100% Gurbandi almonds", "Small kernels, intense nuttiness"),
  product("cow-ghee-roasted-almonds", "Cow Ghee Roasted Almonds", "almonds", "Almonds, cow ghee, rock salt", "Aromatic and gently roasted"),
  product("premium-cashews", "Premium Cashews", "cashews", "100% whole cashews", "Creamy, clean and beautifully whole", true),
  product("kaju-tukda", "Kaju Tukda", "cashews", "100% cashew pieces", "Everyday versatility, premium taste"),
  product("signature-mix", "Signature Mix", "mixtures", "Almonds, cashews, walnuts, pistachios, raisins", "Our most generous house blend", true),
  product("daily-needs-mix", "Daily Needs Mix", "mixtures", "Almonds, cashews, walnuts, golden raisins", "Balanced for everyday routines"),
  product("kids-mix", "Kids Mix", "mixtures", "Cashews, almonds, raisins, makhana", "Gentle textures, naturally joyful"),
  product("premium-walnuts", "Premium Walnuts", "walnuts", "100% premium walnut kernels", "Large, golden and beautifully clean"),
  product("classic-walnuts", "Classic Walnuts", "walnuts", "100% walnut kernels", "Earthy flavour for everyday nourishment"),
  product("premium-gift-box", "Premium Gift Box", "gifts", "A curated selection of premium nuts", "A graceful all-occasion gift", true),
  product("family-gift-box", "Family Gift Box", "gifts", "Family-sized assortment of nuts and makhana", "Made for sharing"),
  product("festive-gift-box", "Festive Gift Box", "gifts", "Celebration assortment of nuts and dry-fruit blends", "Festive warmth, refined presentation"),
  product("luxury-gift-hamper", "Luxury Gift Hamper", "gifts", "An elevated assortment of our finest selections", "Our most indulgent collection"),
  product("corporate-gift-box", "Corporate Gift Box", "gifts", "Premium nuts in a presentation-ready box", "Distinguished gifting at scale"),
  product("wedding-return-gift-pack", "Wedding Return Gift Pack", "gifts", "A celebratory nut and dry-fruit selection", "A memorable gesture of gratitude"),
  product("healthy-snacking-gift-box", "Healthy Snacking Gift Box", "gifts", "Makhana, almonds, cashews and signature mix", "Wholesome favourites, beautifully presented"),
  product("build-your-own-gift-pack", "Build Your Own Gift Pack", "gifts", "Your choice of Kisan Gaurav favourites", "A personalised expression of care"),
];

export const categoryById = Object.fromEntries(categories.map((category) => [category.id, category]));
export const productBySlug = Object.fromEntries(products.map((item) => [item.slug, item]));
