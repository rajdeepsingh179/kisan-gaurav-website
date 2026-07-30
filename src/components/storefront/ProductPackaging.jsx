import { Check } from "lucide-react";

const CATEGORY_PRESENTATION = {
  makhana: {
    accent: "#1f5a3a",
    accentSoft: "#e1eadf",
    badges: ["Farm selected", "Light & crisp"],
  },
  almonds: {
    accent: "#8b5a2b",
    accentSoft: "#eadcc7",
    badges: ["Naturally nutritious", "Premium quality"],
  },
  cashews: {
    accent: "#c56b2d",
    accentSoft: "#f2e3ce",
    badges: ["Premium quality", "Creamy kernels"],
  },
  mixtures: {
    accent: "#741f35",
    accentSoft: "#ead8dc",
    badges: ["Balanced blend", "Naturally nutritious"],
  },
  walnuts: {
    accent: "#694531",
    accentSoft: "#e5d9d0",
    badges: ["Premium quality", "Naturally nutritious"],
  },
  gifts: {
    accent: "#24493d",
    accentSoft: "#dce6df",
    badges: ["Curated selection", "Gift ready"],
  },
};

const FALLBACK_PRESENTATION = {
  accent: "#285443",
  accentSoft: "#dce7e0",
  badges: ["Farm selected", "Premium quality"],
};

function getNetWeight(item, variant) {
  const selected = variant || item?.variants?.[0] || "";
  if (selected) return selected.replace(/\bgm\b/i, "g");
  const defaultVariant = Object.values(item?.variantDetails || {}).find((entry) => entry?.is_default);
  return defaultVariant?.weight_grams ? `${defaultVariant.weight_grams} g` : "Premium pack";
}

export default function ProductPackaging({
  item,
  variant,
  priority = false,
  size = "card",
}) {
  const presentation = CATEGORY_PRESENTATION[item.category] || FALLBACK_PRESENTATION;
  const isGift = item.category === "gifts";
  const productImage = item.detailImage || item.image;
  const style = {
    "--pack-accent": presentation.accent,
    "--pack-accent-soft": presentation.accentSoft,
  };

  return (
    <figure
      className={`product-packaging product-packaging--${size} ${isGift ? "product-packaging--gift" : ""}`}
      style={style}
      aria-label={`${item.name} in Kisan Gaurav premium packaging`}
    >
      <div className="product-packaging__shadow" aria-hidden="true" />
      <div className="product-packaging__pouch">
        <div className="product-packaging__face">
          <img
            className="product-packaging__logo"
            src="/brand/kisan-gaurav-logo.svg"
            width="1254"
            height="1254"
            alt=""
            aria-hidden="true"
          />
          <p className="product-packaging__brand">Kisan Gaurav</p>
          <h2>{item.name}</h2>
          <p className="product-packaging__tagline">From the Roots, For India</p>
          <div className="product-packaging__product">
            <img
              src={productImage}
              width="1800"
              height="1800"
              alt={`${item.name}, premium quality ${item.category === "gifts" ? "gift selection" : "food product"}`}
              decoding="async"
              fetchPriority={priority ? "high" : "auto"}
              loading={priority ? "eager" : "lazy"}
            />
          </div>
          <div className="product-packaging__badges" aria-label="Product features">
            {presentation.badges.map((badge) => (
              <span key={badge}><Check aria-hidden="true" />{badge}</span>
            ))}
          </div>
          <p className="product-packaging__weight">{getNetWeight(item, variant)}</p>
        </div>
      </div>
    </figure>
  );
}

