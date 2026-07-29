import { HTTPError } from "./http.js";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COUPON = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;
const SKU = /^[A-Za-z0-9][A-Za-z0-9._/-]{1,63}$/;
const ACTIVE_CONTENT = /<\s*(?:script|iframe|object|embed|applet|meta|link|base|form|svg|math)\b|\son[a-z0-9_-]+\s*=|(?:javascript|vbscript)\s*:|data\s*:\s*text\/html/i;
const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const hasControlCharacters = (value) => [...value].some((character) => {
  const code = character.charCodeAt(0);
  return code === 127 || (code < 32 && ![9, 10, 13].includes(code));
});

const fail = (message, code = "invalid_payload") => { throw new HTTPError(400, message, code); };
const text = (value, name, { required = false, max = 5000, min = 0 } = {}) => {
  const result = String(value ?? "").trim();
  if (required && result.length < Math.max(1, min)) fail(`${name} is required.`);
  if (result.length < min || result.length > max || hasControlCharacters(result) || ACTIVE_CONTENT.test(result)) fail(`${name} is invalid, unsafe, or exceeds ${max} characters.`);
  return result;
};
const optionalText = (value, name, max) => {
  if (value === undefined || value === null || value === "") return null;
  return text(value, name, { max });
};
const integer = (value, name, { min = 0, max = Number.MAX_SAFE_INTEGER, nullable = false } = {}) => {
  if (nullable && (value === undefined || value === null || value === "")) return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) fail(`${name} must be an integer between ${min} and ${max}.`);
  return number;
};
const date = (value, name, nullable = true) => {
  if (nullable && !value) return null;
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) fail(`${name} must be a valid date.`);
  return parsed.toISOString();
};
const slug = (value, name = "Slug") => {
  const result = text(value, name, { required: true, max: 120 });
  if (!SLUG.test(result)) fail(`${name} must contain lowercase letters, numbers and single hyphens only.`);
  return result;
};
const url = (value, name, nullable = true) => {
  if (nullable && !value) return null;
  const result = text(value, name, { required: true, max: 2048 });
  if (result.startsWith("/")) {
    if (result.startsWith("//") || /[\r\n\\]/.test(result)) fail(`${name} is invalid.`);
    return result;
  }
  try {
    const parsed = new URL(result);
    if (parsed.protocol !== "https:") fail(`${name} must use HTTPS or a site-relative path.`);
  } catch {
    fail(`${name} must be a valid HTTPS URL or site-relative path.`);
  }
  return result;
};

export function assertSafeStructuredValue(value, name = "Content", maxBytes = 500_000) {
  let serialized;
  try { serialized = JSON.stringify(value); } catch { fail(`${name} must be valid JSON.`); }
  if (serialized === undefined || new TextEncoder().encode(serialized).byteLength > maxBytes) fail(`${name} exceeds the ${Math.floor(maxBytes / 1000)} KB limit.`);
  const walk = (item, depth = 0) => {
    if (depth > 20) fail(`${name} is nested too deeply.`);
    if (typeof item === "string") {
      if (item.length > 100_000 || hasControlCharacters(item) || ACTIVE_CONTENT.test(item)) fail(`${name} contains unsafe active content.`);
      return;
    }
    if (Array.isArray(item)) {
      if (item.length > 1000) fail(`${name} contains too many items.`);
      item.forEach((child) => walk(child, depth + 1));
      return;
    }
    if (item && typeof item === "object") {
      const entries = Object.entries(item);
      if (entries.length > 1000 || entries.some(([key]) => BLOCKED_KEYS.has(key))) fail(`${name} contains unsafe object keys.`);
      entries.forEach(([, child]) => walk(child, depth + 1));
    }
  };
  walk(value);
  return value;
}

function parseStructured(value, name, fallback = {}) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return assertSafeStructuredValue(value, name);
  try { return assertSafeStructuredValue(JSON.parse(value), name); } catch (error) {
    if (error instanceof HTTPError) throw error;
    fail(`${name} must be valid JSON.`);
  }
}

export function validateProduct(data) {
  const status = data.status || "draft";
  if (!["draft", "published", "archived"].includes(status)) fail("Invalid product status.");
  const variants = Array.isArray(data.variants) ? data.variants : [];
  if (variants.length > 100) fail("A product cannot contain more than 100 variants.");
  const seenSkus = new Set();
  const normalizedVariants = variants.map((variant, index) => {
    const sku = text(variant.sku, `Variant ${index + 1} SKU`, { required: true, max: 64 });
    if (!SKU.test(sku) || seenSkus.has(sku.toLowerCase())) fail(`Variant ${index + 1} has an invalid or duplicate SKU.`);
    seenSkus.add(sku.toLowerCase());
    const pricePaise = integer(variant.pricePaise, `Variant ${index + 1} price`, { max: 100_000_000 });
    const mrpPaise = integer(variant.mrpPaise, `Variant ${index + 1} MRP`, { max: 100_000_000, nullable: true });
    if (mrpPaise !== null && mrpPaise < pricePaise) fail(`Variant ${index + 1} MRP cannot be lower than its price.`);
    return {
      ...variant,
      id: optionalText(variant.id, `Variant ${index + 1} ID`, 100),
      name: text(variant.name, `Variant ${index + 1} name`, { required: true, max: 120 }),
      sku,
      pricePaise,
      compareAtPricePaise: integer(variant.compareAtPricePaise, "Compare-at price", { max: 100_000_000, nullable: true }),
      mrpPaise,
      discountBasisPoints: integer(variant.discountBasisPoints ?? 0, "Discount", { max: 10_000 }),
      festivalPricePaise: integer(variant.festivalPricePaise, "Festival price", { max: 100_000_000, nullable: true }),
      bulkPricePaise: integer(variant.bulkPricePaise, "Bulk price", { max: 100_000_000, nullable: true }),
      wholesalePricePaise: integer(variant.wholesalePricePaise, "Wholesale price", { max: 100_000_000, nullable: true }),
      stock: integer(variant.stock ?? 0, "Stock", { max: 10_000_000 }),
      lowStockThreshold: integer(variant.lowStockThreshold ?? 5, "Low-stock threshold", { max: 1_000_000 }),
      weightGrams: integer(variant.weightGrams, "Weight", { min: 1, max: 1_000_000, nullable: true }),
    };
  });
  if (normalizedVariants.filter((variant) => variant.isDefault).length > 1) fail("Only one variant may be the default.");
  const seenMedia = new Set();
  const media = Array.isArray(data.media) ? data.media.slice(0, 100).map((item, index) => {
    const mediaId = text(item.mediaId, `Media ${index + 1} ID`, { required: true, max: 100 });
    if (seenMedia.has(mediaId)) fail("A media asset may only be attached to a product once.");
    seenMedia.add(mediaId);
    return {
      mediaId,
      mediaType: ["hero", "gallery", "hover", "lifestyle"].includes(item.mediaType) ? item.mediaType : "gallery",
      sortOrder: integer(item.sortOrder ?? index * 10, "Media sort order", { max: 1_000_000 }),
    };
  }) : [];
  if (status === "published" && normalizedVariants.length === 0) fail("Published products require at least one variant.");
  return {
    ...data,
    id: optionalText(data.id, "Product ID", 100),
    categoryId: text(data.categoryId, "Category", { required: true, max: 100 }),
    name: text(data.name, "Product name", { required: true, max: 180 }),
    slug: slug(data.slug),
    brand: text(data.brand || "Kisan Gaurav", "Brand", { required: true, max: 120 }),
    subcategory: optionalText(data.subcategory, "Subcategory", 120),
    description: optionalText(data.description, "Description", 20_000),
    benefits: optionalText(data.benefits, "Benefits", 20_000),
    ingredients: optionalText(data.ingredients, "Ingredients", 20_000),
    nutrition: optionalText(data.nutrition, "Nutrition", 20_000),
    storage: optionalText(data.storage, "Storage", 5000),
    shelfLife: optionalText(data.shelfLife, "Shelf life", 500),
    countryOfOrigin: text(data.countryOfOrigin || "India", "Country of origin", { required: true, max: 120 }),
    hsnCode: optionalText(data.hsnCode, "HSN code", 32),
    gstBasisPoints: integer(data.gstBasisPoints ?? 500, "GST", { max: 10_000 }),
    barcode: optionalText(data.barcode, "Barcode", 64),
    imageUrl: url(data.imageUrl, "Hero image"),
    detailImageUrl: url(data.detailImageUrl, "Detail image"),
    seoTitle: optionalText(data.seoTitle, "SEO title", 180),
    seoDescription: optionalText(data.seoDescription, "SEO description", 500),
    status,
    active: status === "archived" ? false : data.active !== false,
    archived: status === "archived" || data.archived === true,
    variants: normalizedVariants,
    media,
  };
}

export function validateCategory(data) {
  return {
    ...data,
    id: optionalText(data.id, "Category ID", 100),
    name: text(data.name, "Category name", { required: true, max: 120 }),
    slug: slug(data.slug),
    description: optionalText(data.description, "Description", 5000),
    shortDescription: optionalText(data.shortDescription, "Short description", 500),
    longDescription: optionalText(data.longDescription, "Long description", 20_000),
    seoTitle: optionalText(data.seoTitle, "SEO title", 180),
    seoDescription: optionalText(data.seoDescription, "SEO description", 500),
    imageUrl: url(data.imageUrl, "Category image"),
    heroImageUrl: url(data.heroImageUrl, "Hero image"),
    bannerImageUrl: url(data.bannerImageUrl, "Banner image"),
    thumbnailUrl: url(data.thumbnailUrl, "Thumbnail"),
    sortOrder: integer(data.sortOrder ?? 0, "Sort order", { max: 1_000_000 }),
  };
}

export function validateCoupon(data) {
  const type = ["percent", "flat"].includes(data.type) ? data.type : fail("Invalid coupon type.");
  const code = text(data.code, "Coupon code", { required: true, max: 32 }).toUpperCase();
  if (!COUPON.test(code)) fail("Coupon code must use 3–32 letters, numbers, underscores or hyphens.");
  const value = integer(data.value, "Coupon value", { min: 1, max: type === "percent" ? 100 : 100_000_000 });
  return {
    ...data,
    id: optionalText(data.id, "Coupon ID", 100),
    code,
    type,
    value,
    minimumOrderPaise: integer(data.minimumOrderPaise ?? 0, "Minimum order", { max: 100_000_000 }),
    usageLimit: integer(data.usageLimit, "Usage limit", { min: 1, max: 10_000_000, nullable: true }),
    expiresAt: date(data.expiresAt, "Expiry date"),
  };
}

export function validateCmsEntry(data) {
  const status = data.status || "draft";
  const visibility = data.visibility || "sitewide";
  if (!["draft", "published", "scheduled", "archived"].includes(status)) fail("Invalid content status.");
  if (!["sitewide", "homepage", "hidden"].includes(visibility)) fail("Invalid content visibility.");
  const content = parseStructured(data.content, "CMS content");
  const seo = parseStructured(data.seo, "CMS SEO", {});
  const publishAt = date(data.publishAt, "Publish date");
  const expiresAt = date(data.expiresAt, "Expiry date");
  if (status === "scheduled" && !publishAt) fail("Scheduled content requires a publish date.");
  if (publishAt && expiresAt && new Date(expiresAt) <= new Date(publishAt)) fail("Expiry date must be after the publish date.");
  return {
    ...data,
    id: optionalText(data.id, "Content ID", 100),
    entryType: slug(data.entryType, "Content type"),
    slug: slug(data.slug),
    title: text(data.title, "Title", { required: true, max: 240 }),
    excerpt: optionalText(data.excerpt, "Excerpt", 2000),
    content,
    seo,
    status,
    visibility,
    publishAt,
    expiresAt,
    parentId: optionalText(data.parentId, "Parent ID", 100),
    sortOrder: integer(data.sortOrder ?? 0, "Sort order", { max: 1_000_000 }),
    changeNote: optionalText(data.changeNote, "Change note", 500),
  };
}

export function validateSetting(keyValue, data) {
  const key = text(keyValue, "Setting key", { required: true, max: 100 });
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(key) || key.startsWith("payment_intent:")) fail("Setting key is invalid or reserved.");
  return { key, value: assertSafeStructuredValue(data, "Setting value", 100_000) };
}

export function validateOrderRequest(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) fail("Order payload is invalid.");
  const customer = data.customer && typeof data.customer === "object" ? data.customer : {};
  const address = data.address && typeof data.address === "object" ? data.address : {};
  const email = text(customer.email, "Email", { required: true, max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Email address is invalid.");
  const phone = text(customer.phone, "Phone", { required: true, max: 20 }).replace(/[\s()-]/g, "");
  if (!/^\+?[0-9]{10,15}$/.test(phone)) fail("Phone number is invalid.");
  const pincode = text(address.pincode, "Pincode", { required: true, max: 12 });
  if (!/^[A-Za-z0-9 -]{4,12}$/.test(pincode)) fail("Pincode is invalid.");
  return {
    ...data,
    customer: {
      ...customer,
      name: text(customer.name, "Customer name", { required: true, max: 150 }),
      email,
      phone,
    },
    address: {
      ...address,
      line1: text(address.line1, "Address line 1", { required: true, max: 250 }),
      line2: optionalText(address.line2, "Address line 2", 250),
      city: text(address.city, "City", { required: true, max: 120 }),
      state: text(address.state, "State", { required: true, max: 120 }),
      pincode,
    },
    saveAddress: data.saveAddress === true,
  };
}
