CREATE TABLE cms_entries (
  id TEXT PRIMARY KEY,
  entry_type TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content_json TEXT NOT NULL DEFAULT '{}',
  seo_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','scheduled','archived')),
  publish_at TEXT,
  expires_at TEXT,
  visibility TEXT NOT NULL DEFAULT 'sitewide' CHECK(visibility IN ('sitewide','homepage','hidden')),
  parent_id TEXT REFERENCES cms_entries(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  current_version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  updated_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entry_type, slug)
);

CREATE TABLE cms_versions (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES cms_entries(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entry_id, version)
);

CREATE TABLE cms_taxonomies (
  id TEXT PRIMARY KEY,
  taxonomy_type TEXT NOT NULL CHECK(taxonomy_type IN ('blog_category','tag','faq_category')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(taxonomy_type, slug)
);

CREATE TABLE cms_entry_taxonomies (
  entry_id TEXT NOT NULL REFERENCES cms_entries(id) ON DELETE CASCADE,
  taxonomy_id TEXT NOT NULL REFERENCES cms_taxonomies(id) ON DELETE CASCADE,
  PRIMARY KEY(entry_id, taxonomy_id)
);

CREATE TABLE menu_items (
  id TEXT PRIMARY KEY,
  menu_location TEXT NOT NULL,
  parent_id TEXT REFERENCES menu_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  media_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
  mega_menu INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE email_templates (
  id TEXT PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preheader TEXT,
  html_content TEXT NOT NULL,
  text_content TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  current_version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cms_type_status ON cms_entries(entry_type,status,sort_order);
CREATE INDEX idx_cms_schedule ON cms_entries(status,publish_at,expires_at);
CREATE INDEX idx_cms_versions ON cms_versions(entry_id,version DESC);
CREATE INDEX idx_menu_location ON menu_items(menu_location,parent_id,sort_order);

INSERT INTO cms_entries(id,entry_type,slug,title,excerpt,content_json,status,visibility,sort_order) VALUES
  ('cms-home-announcement','home','announcement','Announcement Bar','Complimentary delivery on eligible orders','{"text":"Complimentary delivery on eligible orders","linkLabel":"Shop now","linkUrl":"/shop"}','published','sitewide',10),
  ('cms-home-hero','home','hero','Goodness, grown with pride.','Exceptional dry fruits, mindful blends and gifts.','{"eyebrow":"Premium foods · Thoughtfully sourced","heading":"Goodness, grown with pride.","subheading":"Exceptional dry fruits, mindful blends and gifts made to honour the goodness of India’s harvests.","primaryCta":{"label":"Explore the collection","url":"/shop"},"secondaryCta":{"label":"Our story","url":"/about"},"backgroundImage":"/images/storefront/hero-2000.webp","badge":"Rooted in Indian goodness"}','published','homepage',20),
  ('cms-home-marquee','home','marquee','Brand Promises',NULL,'{"items":["Thoughtfully sourced","Premium pantry staples","Made for modern rituals","Gift wellness beautifully"]}','published','homepage',25),
  ('cms-home-categories','home','featured-categories','Featured Categories','A pantry of considered choices.','{"heading":"A pantry of considered choices.","description":"Find naturally satisfying food for every kind of moment.","selectionMode":"featured"}','published','homepage',30),
  ('cms-home-featured','home','featured-products','Featured Products','Made for your everyday rituals.','{"heading":"Made for your everyday rituals.","selectionMode":"featured"}','published','homepage',40),
  ('cms-home-best','home','best-sellers','Best Sellers',NULL,'{"heading":"Our best sellers","selectionMode":"best_seller"}','published','homepage',50),
  ('cms-home-new','home','new-arrivals','New Arrivals',NULL,'{"heading":"New arrivals","selectionMode":"new_arrival"}','published','homepage',60),
  ('cms-home-why','home','why-choose-us','Why Choose Us','Because every good thing begins at the source.','{"eyebrow":"Why Kisan Gaurav","mark":"किसान","heading":"Because every good thing begins at the source.","body":"Our name means the pride of the farmer. It reminds us to look beyond the pack—to the soil, skill and patient care behind every ingredient.","cta":{"label":"Read our story","url":"/about"},"items":[{"title":"Thoughtfully sourced","text":"Ingredients chosen with care"},{"title":"Quality selected","text":"Clean taste and natural texture"},{"title":"Freshness considered","text":"Resealable premium packaging"},{"title":"Beautifully giftable","text":"Quiet luxury for every occasion"}]}','published','homepage',70),
  ('cms-home-statistics','home','statistics','Statistics',NULL,'{"items":[{"value":"23+","label":"Premium products"},{"value":"6","label":"Collections"},{"value":"100%","label":"Thoughtfully selected"}]}','published','homepage',80),
  ('cms-home-testimonials','home','testimonials','Customer Testimonials',NULL,'{"items":[]}','published','homepage',90),
  ('cms-home-partners','home','partner-logos','Partner Logos',NULL,'{"items":[]}','published','homepage',100),
  ('cms-home-gallery','home','gallery','Homepage Gallery',NULL,'{"items":[]}','published','homepage',110),
  ('cms-home-newsletter','home','newsletter','Newsletter','Goodness, delivered.','{"heading":"Goodness, delivered.","body":"Seasonal edits, thoughtful gifting and pantry inspiration.","buttonLabel":"Subscribe"}','published','homepage',120),
  ('cms-home-gifting','home','gifting','The Art of Thoughtful Gifting','Give something genuinely good.','{"eyebrow":"The art of thoughtful gifting","heading":"Give something genuinely good.","body":"Curated dry-fruit collections for families, festivities, weddings and meaningful corporate moments.","cta":{"label":"Explore gift packs","url":"/category/gifts"},"image":"/images/storefront/premium-gift-box-detail.webp"}','published','homepage',130),
  ('cms-footer','footer','main','Footer','Rooted in Indian goodness.','{"copyright":"© {year} Kisan Gaurav. All rights reserved.","description":"Premium pantry staples and thoughtful gifting, rooted in Indian goodness.","quickLinksTitle":"Explore","supportLinksTitle":"Support","newsletterTitle":"Stay close","newsletterText":"New collections, nourishing ideas and gifting notes.","bottomNote":"Made with respect for the source.","socialLinks":[]}','published','sitewide',10),
  ('cms-about','page','about','About Kisan Gaurav','The pride of the farmer.','{"mission":"Make exceptional Indian harvests part of modern everyday rituals.","vision":"A future where thoughtful food honours both people and the source.","story":"Kisan Gaurav means the pride of the farmer.","founderMessage":"","timeline":[],"achievements":[],"images":[],"videos":[]}','published','sitewide',10),
  ('cms-contact','page','contact','Contact Us','We would love to hear from you.','{"phone":"","email":"","address":"","googleMapUrl":"","businessHours":[],"socialLinks":[]}','published','sitewide',20),
  ('cms-privacy','legal','privacy-policy','Privacy Policy',NULL,'{"body":""}','draft','sitewide',10),
  ('cms-terms','legal','terms-and-conditions','Terms & Conditions',NULL,'{"body":""}','draft','sitewide',20),
  ('cms-shipping','legal','shipping-policy','Shipping Policy',NULL,'{"body":""}','draft','sitewide',30),
  ('cms-return','legal','return-policy','Return Policy',NULL,'{"body":""}','draft','sitewide',40),
  ('cms-refund','legal','refund-policy','Refund Policy',NULL,'{"body":""}','draft','sitewide',50),
  ('cms-cancellation','legal','cancellation-policy','Cancellation Policy',NULL,'{"body":""}','draft','sitewide',60),
  ('cms-cookies','legal','cookies-policy','Cookies Policy',NULL,'{"body":""}','draft','sitewide',70),
  ('cms-search','search','settings','Search Management',NULL,'{"suggestions":[],"trendingSearches":[],"popularProductIds":[]}','published','sitewide',10);

INSERT INTO cms_taxonomies(id,taxonomy_type,name,slug,sort_order) VALUES
  ('tax-faq-general','faq_category','General','general',10),
  ('tax-blog-stories','blog_category','Stories','stories',10),
  ('tax-blog-guides','blog_category','Guides','guides',20);

INSERT INTO menu_items(id,menu_location,label,url,mega_menu,enabled,sort_order) VALUES
  ('menu-main-home','main','Home','/',0,1,10),
  ('menu-main-shop','main','Shop','/shop',0,1,20),
  ('menu-main-categories','main','Categories','/categories',1,1,30),
  ('menu-main-digital','main','Kisan Gaurav Digital','/kisan-digital',1,1,40),
  ('menu-main-about','main','About','/about',0,1,50),
  ('menu-main-contact','main','Contact','/contact',0,1,60);

INSERT INTO menu_items(id,menu_location,label,url,mega_menu,enabled,sort_order) VALUES
  ('menu-footer-shop','footer_quick','Shop all','/shop',0,1,10),
  ('menu-footer-categories','footer_quick','Categories','/categories',0,1,20),
  ('menu-footer-digital','footer_quick','Kisan Gaurav Digital','/kisan-digital',0,1,30),
  ('menu-footer-about','footer_support','Our story','/about',0,1,10),
  ('menu-footer-contact','footer_support','Contact','/contact',0,1,20),
  ('menu-footer-faq','footer_support','FAQs','/faq',0,1,30),
  ('menu-policy-privacy','footer_policies','Privacy Policy','/policies/privacy-policy',0,1,10),
  ('menu-policy-terms','footer_policies','Terms & Conditions','/policies/terms-and-conditions',0,1,20),
  ('menu-policy-shipping','footer_policies','Shipping Policy','/policies/shipping-policy',0,1,30),
  ('menu-policy-return','footer_policies','Return Policy','/policies/return-policy',0,1,40);

INSERT INTO email_templates(id,template_key,name,subject,preheader,html_content,text_content,enabled) VALUES
  ('email-welcome','welcome','Welcome Email','Welcome to Kisan Gaurav','Goodness begins here.','<h1>Welcome to Kisan Gaurav</h1><p>Thank you for joining us.</p>','Welcome to Kisan Gaurav. Thank you for joining us.',1),
  ('email-order','order_confirmation','Order Confirmation','Your Kisan Gaurav order is confirmed','We are preparing your order.','<h1>Order confirmed</h1><p>Your order {{orderNumber}} is confirmed.</p>','Your order {{orderNumber}} is confirmed.',1),
  ('email-shipping','shipping_update','Shipping Update','Your order is on its way','Track your Kisan Gaurav delivery.','<h1>Your order is on its way</h1><p>Track: {{trackingUrl}}</p>','Your order is on its way: {{trackingUrl}}',1),
  ('email-password','password_reset','Password Reset','Reset your Kisan Gaurav password','This link expires in one hour.','<h1>Reset your password</h1><p><a href="{{resetUrl}}">Reset password</a></p>','Reset your password: {{resetUrl}}',1),
  ('email-newsletter','newsletter','Newsletter','Goodness from Kisan Gaurav','News, harvests and thoughtful food.','<h1>Goodness, delivered</h1>','Goodness, delivered.',1),
  ('email-promotions','promotions','Promotions','A thoughtful offer from Kisan Gaurav','Selected especially for you.','<h1>A thoughtful offer</h1>','A thoughtful offer from Kisan Gaurav.',1);

INSERT INTO cms_versions(id,entry_id,version,snapshot_json,change_note)
SELECT
  'version-'||id,id,1,
  json_object(
    'entryType',entry_type,'slug',slug,'title',title,'excerpt',excerpt,'content',json(content_json),
    'seo',json(seo_json),'status',status,'publishAt',publish_at,'expiresAt',expires_at,
    'visibility',visibility,'parentId',parent_id,'sortOrder',sort_order
  ),
  'Initial content'
FROM cms_entries;
