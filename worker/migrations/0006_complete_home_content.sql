INSERT OR IGNORE INTO cms_entries(id,entry_type,slug,title,excerpt,content_json,status,visibility,sort_order) VALUES
  ('cms-home-marquee','home','marquee','Brand Promises',NULL,'{"items":["Thoughtfully sourced","Premium pantry staples","Made for modern rituals","Gift wellness beautifully"]}','published','homepage',25),
  ('cms-home-gifting','home','gifting','The Art of Thoughtful Gifting','Give something genuinely good.','{"eyebrow":"The art of thoughtful gifting","heading":"Give something genuinely good.","body":"Curated dry-fruit collections for families, festivities, weddings and meaningful corporate moments.","cta":{"label":"Explore gift packs","url":"/category/gifts"},"image":"/images/storefront/premium-gift-box-detail.webp"}','published','homepage',130);

UPDATE cms_entries SET content_json='{"copyright":"© {year} Kisan Gaurav. All rights reserved.","description":"Premium pantry staples and thoughtful gifting, rooted in Indian goodness.","quickLinksTitle":"Explore","supportLinksTitle":"Support","newsletterTitle":"Stay close","newsletterText":"New collections, nourishing ideas and gifting notes.","bottomNote":"Made with respect for the source.","socialLinks":[]}' WHERE id='cms-footer';
UPDATE cms_entries SET content_json='{"eyebrow":"Why Kisan Gaurav","mark":"किसान","heading":"Because every good thing begins at the source.","body":"Our name means the pride of the farmer. It reminds us to look beyond the pack—to the soil, skill and patient care behind every ingredient.","cta":{"label":"Read our story","url":"/about"},"items":[{"title":"Thoughtfully sourced","text":"Ingredients chosen with care"},{"title":"Quality selected","text":"Clean taste and natural texture"},{"title":"Freshness considered","text":"Resealable premium packaging"},{"title":"Beautifully giftable","text":"Quiet luxury for every occasion"}]}' WHERE id='cms-home-why';

INSERT OR IGNORE INTO menu_items(id,menu_location,label,url,mega_menu,enabled,sort_order) VALUES
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

INSERT OR IGNORE INTO cms_versions(id,entry_id,version,snapshot_json,change_note)
SELECT
  'version-'||id,id,1,
  json_object(
    'entryType',entry_type,'slug',slug,'title',title,'excerpt',excerpt,'content',json(content_json),
    'seo',json(seo_json),'status',status,'publishAt',publish_at,'expiresAt',expires_at,
    'visibility',visibility,'parentId',parent_id,'sortOrder',sort_order
  ),
  'Initial content'
FROM cms_entries
WHERE id IN ('cms-home-marquee','cms-home-gifting');
