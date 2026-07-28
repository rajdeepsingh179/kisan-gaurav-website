INSERT OR IGNORE INTO categories(
  id,name,slug,description,short_description,long_description,hero_image_url,thumbnail_url,
  featured,homepage_visible,navigation_visible,active,sort_order
) VALUES
  ('category-makhana','Premium Makhana','makhana','Hand-selected fox nuts with clean seasonings and an elegant crunch.','Light, crisp & consciously roasted','Hand-selected fox nuts with clean seasonings and an elegant crunch.','/images/storefront/makhana-hero.webp','/images/storefront/classic-makhana-card.webp',1,1,1,1,10),
  ('category-almonds','Almonds','almonds','Thoughtfully sourced almonds chosen for flavour, texture and freshness.','Naturally rich everyday nourishment','Thoughtfully sourced almonds chosen for flavour, texture and freshness.','/images/storefront/almonds-hero.webp','/images/storefront/whole-almonds-card.webp',1,1,1,1,20),
  ('category-cashews','Cashews','cashews','Premium kernels with a naturally buttery finish.','Creamy, delicate & beautifully whole','Premium kernels with a naturally buttery finish.','/images/storefront/cashews-hero.webp','/images/storefront/premium-cashews-card.webp',1,1,1,1,30),
  ('category-mixtures','Dry Fruit Mixtures','mixtures','Purposeful combinations of nuts and dried fruit for the whole family.','Balanced blends for every day','Purposeful combinations of nuts and dried fruit for the whole family.','/images/storefront/mixtures-hero.webp','/images/storefront/signature-mix-card.webp',1,1,1,1,40),
  ('category-walnuts','Walnuts','walnuts','Golden walnut kernels selected for clean flavour and generous texture.','Earthy, wholesome & satisfying','Golden walnut kernels selected for clean flavour and generous texture.','/images/storefront/walnuts-hero.webp','/images/storefront/premium-walnuts-card.webp',1,1,1,1,50),
  ('category-gifts','Gift Packs','gifts','Considered collections for celebrations, families and thoughtful occasions.','A refined way to share good health','Considered collections for celebrations, families and thoughtful occasions.','/images/storefront/gifts-hero.webp','/images/storefront/premium-gift-box-card.webp',1,1,1,1,60);

CREATE TABLE seed_catalog(
  slug TEXT,name TEXT,category TEXT,ingredients TEXT,benefits TEXT,featured INTEGER,new_arrival INTEGER,
  price1 INTEGER,price2 INTEGER,price3 INTEGER
);
INSERT INTO seed_catalog VALUES
  ('classic-makhana','Classic Makhana','makhana','Premium fox nuts, rock salt','Clean, delicate crunch',1,0,29900,59900,109900),
  ('rasgulla-makhana','Rasgulla Makhana','makhana','Fox nuts, milk solids, raw sugar, cardamom','A playful mithai-inspired finish',0,1,44900,74900,119900),
  ('black-pepper-makhana','Black Pepper Makhana','makhana','Fox nuts, black pepper, rock salt','Warm pepper, gentle heat',0,0,39900,69900,109900),
  ('cow-ghee-roasted-makhana','Cow Ghee Roasted Makhana','makhana','Fox nuts, cow ghee, rock salt','Slow roasted, deeply comforting',1,0,39900,69900,109900),
  ('whole-almonds','Whole Almonds','almonds','100% whole almonds','Crisp, naturally sweet kernels',1,0,44900,74900,104900),
  ('mamra-almonds','Mamra Almonds','almonds','100% Mamra almonds','Characterful shape, rich flavour',0,0,54900,84900,114900),
  ('gurbandi-almonds','Gurbandi Almonds','almonds','100% Gurbandi almonds','Small kernels, intense nuttiness',0,0,59900,89900,119900),
  ('cow-ghee-roasted-almonds','Cow Ghee Roasted Almonds','almonds','Almonds, cow ghee, rock salt','Aromatic and gently roasted',0,0,49900,79900,109900),
  ('premium-cashews','Premium Cashews','cashews','100% whole cashews','Creamy, clean and beautifully whole',1,0,64900,94900,124900),
  ('kaju-tukda','Kaju Tukda','cashews','100% cashew pieces','Everyday versatility, premium taste',0,0,64900,94900,124900),
  ('signature-mix','Signature Mix','mixtures','Almonds, cashews, walnuts, pistachios, raisins','Our most generous house blend',1,0,64900,94900,124900),
  ('daily-needs-mix','Daily Needs Mix','mixtures','Almonds, cashews, walnuts, golden raisins','Balanced for everyday routines',0,0,69900,99900,129900),
  ('kids-mix','Kids Mix','mixtures','Premium almonds, cashews, raisins, walnuts and pistachios','Thoughtfully curated for growing children',0,1,54900,84900,114900),
  ('premium-walnuts','Premium Walnuts','walnuts','100% premium walnut kernels','Large, golden and beautifully clean',0,0,74900,104900,134900),
  ('classic-walnuts','Classic Walnuts','walnuts','100% walnut kernels','Earthy flavour for everyday nourishment',0,0,74900,104900,134900),
  ('premium-gift-box','Premium Gift Box','gifts','A curated selection of premium nuts','A graceful all-occasion gift',1,0,149900,199900,249900),
  ('family-gift-box','Family Gift Box','gifts','Family-sized assortment of nuts and makhana','Made for sharing',0,0,174900,224900,274900),
  ('festive-gift-box','Festive Gift Box','gifts','Celebration assortment of nuts and dry-fruit blends','Festive warmth, refined presentation',0,0,174900,224900,274900),
  ('luxury-gift-hamper','Luxury Gift Hamper','gifts','An elevated assortment of our finest selections','Our most indulgent collection',0,0,99900,149900,199900),
  ('corporate-gift-box','Corporate Gift Box','gifts','Premium nuts in a presentation-ready box','Distinguished gifting at scale',0,0,99900,149900,199900),
  ('wedding-return-gift-pack','Wedding Return Gift Pack','gifts','A celebratory nut and dry-fruit selection','A memorable gesture of gratitude',0,1,174900,224900,274900),
  ('healthy-snacking-gift-box','Healthy Snacking Gift Box','gifts','Makhana, almonds, cashews and signature mix','Wholesome favourites, beautifully presented',0,0,124900,174900,224900),
  ('build-your-own-gift-pack','Build Your Own Gift Pack','gifts','Your choice of Kisan Gaurav favourites','A personalised expression of care',0,0,99900,149900,199900);

INSERT OR IGNORE INTO products(
  id,category_id,name,slug,brand,description,benefits,ingredients,country_of_origin,gst_basis_points,
  image_url,detail_image_url,featured,best_seller,new_arrival,active,status,archived
)
SELECT
  'product-'||s.slug,(SELECT id FROM categories WHERE slug=s.category),s.name,s.slug,'Kisan Gaurav',
  s.benefits,s.benefits,s.ingredients,'India',500,
  '/images/storefront/'||s.slug||'-card.webp','/images/storefront/'||s.slug||'-detail.webp',
  s.featured,s.featured,s.new_arrival,1,'published',0
FROM seed_catalog s;

INSERT OR IGNORE INTO product_variants(
  id,product_id,name,sku,price_paise,compare_at_price_paise,mrp_paise,stock,low_stock_threshold,
  weight_grams,is_default,active
)
SELECT
  'variant-'||s.slug||'-'||n.position,'product-'||s.slug,
  CASE WHEN s.category='gifts' THEN CASE n.position WHEN 1 THEN 'Small' WHEN 2 THEN 'Medium' ELSE 'Large' END
       ELSE CASE n.position WHEN 1 THEN '250 gm' WHEN 2 THEN '500 gm' ELSE '1 kg' END END,
  'KG-'||upper(replace(s.slug,'-',''))||'-'||n.position,
  CASE n.position WHEN 1 THEN s.price1 WHEN 2 THEN s.price2 ELSE s.price3 END,
  CASE n.position WHEN 1 THEN s.price1 WHEN 2 THEN s.price2 ELSE s.price3 END,
  CASE n.position WHEN 1 THEN s.price1 WHEN 2 THEN s.price2 ELSE s.price3 END,
  100,10,
  CASE WHEN s.category='gifts' THEN NULL WHEN n.position=1 THEN 250 WHEN n.position=2 THEN 500 ELSE 1000 END,
  CASE WHEN n.position=1 THEN 1 ELSE 0 END,1
FROM seed_catalog s
CROSS JOIN (SELECT 1 position UNION ALL SELECT 2 UNION ALL SELECT 3) n;

DROP TABLE seed_catalog;
