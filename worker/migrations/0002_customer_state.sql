CREATE TABLE customer_state (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state_key TEXT NOT NULL CHECK(state_key IN ('cart','wishlist')),
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, state_key)
);
INSERT INTO coupons(id,code,type,value,minimum_order_paise,expires_at,usage_limit,enabled)
VALUES
  ('coupon-gaurav10','GAURAV10','percent',10,99900,'2030-12-31T23:59:59Z',1000,1),
  ('coupon-welcome150','WELCOME150','flat',15000,149900,'2030-12-31T23:59:59Z',500,1);
INSERT INTO settings(key,value_json) VALUES
  ('tax','{"gstRate":5,"gstReady":true}'),
  ('shipping','{"freeThresholdPaise":99900,"standardPaise":7900,"expressPaise":14900}'),
  ('store','{"name":"Kisan Gaurav","currency":"INR"}');
