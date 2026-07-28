ALTER TABLE categories ADD COLUMN short_description TEXT;
ALTER TABLE categories ADD COLUMN long_description TEXT;
ALTER TABLE categories ADD COLUMN seo_title TEXT;
ALTER TABLE categories ADD COLUMN seo_description TEXT;
ALTER TABLE categories ADD COLUMN hero_image_url TEXT;
ALTER TABLE categories ADD COLUMN banner_image_url TEXT;
ALTER TABLE categories ADD COLUMN thumbnail_url TEXT;
ALTER TABLE categories ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN homepage_visible INTEGER NOT NULL DEFAULT 1;
ALTER TABLE categories ADD COLUMN navigation_visible INTEGER NOT NULL DEFAULT 1;

ALTER TABLE products ADD COLUMN brand TEXT NOT NULL DEFAULT 'Kisan Gaurav';
ALTER TABLE products ADD COLUMN subcategory TEXT;
ALTER TABLE products ADD COLUMN benefits TEXT;
ALTER TABLE products ADD COLUMN nutrition TEXT;
ALTER TABLE products ADD COLUMN storage TEXT;
ALTER TABLE products ADD COLUMN shelf_life TEXT;
ALTER TABLE products ADD COLUMN country_of_origin TEXT NOT NULL DEFAULT 'India';
ALTER TABLE products ADD COLUMN hsn_code TEXT;
ALTER TABLE products ADD COLUMN gst_basis_points INTEGER NOT NULL DEFAULT 500;
ALTER TABLE products ADD COLUMN barcode TEXT;
ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE products ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;

ALTER TABLE product_variants ADD COLUMN mrp_paise INTEGER;
ALTER TABLE product_variants ADD COLUMN discount_basis_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE product_variants ADD COLUMN festival_price_paise INTEGER;
ALTER TABLE product_variants ADD COLUMN bulk_price_paise INTEGER;
ALTER TABLE product_variants ADD COLUMN wholesale_price_paise INTEGER;
ALTER TABLE product_variants ADD COLUMN weight_grams INTEGER;
ALTER TABLE product_variants ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0;

ALTER TABLE coupons ADD COLUMN scope_type TEXT NOT NULL DEFAULT 'all';
ALTER TABLE coupons ADD COLUMN scope_id TEXT;
ALTER TABLE reviews ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
ALTER TABLE banners ADD COLUMN banner_type TEXT NOT NULL DEFAULT 'homepage';
ALTER TABLE banners ADD COLUMN device TEXT NOT NULL DEFAULT 'both';

CREATE TABLE user_permissions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('admin','manager','staff')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE media_assets (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  folder TEXT NOT NULL DEFAULT 'general',
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_media (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK(media_type IN ('hero','gallery','hover','lifestyle')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(product_id, media_id)
);

CREATE TABLE packaging_assets (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK(asset_type IN ('front','back','side','label_pdf')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE homepage_sections (
  id TEXT PRIMARY KEY,
  section_type TEXT NOT NULL,
  title TEXT,
  content_json TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE digital_content (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL CHECK(content_type IN ('weather','mandi','scheme','icar','article')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  content TEXT,
  image_url TEXT,
  source_url TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE seo_entries (
  id TEXT PRIMARY KEY,
  route TEXT NOT NULL UNIQUE,
  meta_title TEXT,
  meta_description TEXT,
  canonical_url TEXT,
  open_graph_json TEXT NOT NULL DEFAULT '{}',
  twitter_json TEXT NOT NULL DEFAULT '{}',
  robots TEXT NOT NULL DEFAULT 'index,follow',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_media_folder ON media_assets(folder, created_at DESC);
CREATE INDEX idx_activity_created ON activity_logs(created_at DESC);
CREATE INDEX idx_homepage_order ON homepage_sections(enabled, sort_order);
CREATE INDEX idx_digital_type ON digital_content(content_type, status, published_at DESC);

INSERT INTO homepage_sections(id,section_type,title,content_json,enabled,sort_order) VALUES
  ('home-hero','hero','Homepage hero','{}',1,10),
  ('home-featured','featured_products','Featured products','{}',1,20),
  ('home-categories','categories','Shop by category','{}',1,30),
  ('home-best','best_sellers','Best sellers','{}',1,40),
  ('home-new','new_arrivals','New arrivals','{}',1,50),
  ('home-trending','trending_products','Trending products','{}',1,60),
  ('home-testimonials','testimonials','Testimonials','{}',1,70),
  ('home-announcements','announcements','Announcements','{}',1,80);
