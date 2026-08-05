DROP TRIGGER IF EXISTS validate_coupon_redemption;
CREATE TRIGGER validate_coupon_redemption BEFORE INSERT ON coupon_redemptions BEGIN
  SELECT RAISE(ABORT,'COUPON_UNAVAILABLE') WHERE NOT EXISTS(SELECT 1 FROM coupons WHERE id=NEW.coupon_id AND enabled=1 AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP) AND (usage_limit IS NULL OR usage_count<usage_limit));
END;
