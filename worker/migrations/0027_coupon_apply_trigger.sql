DROP TRIGGER IF EXISTS apply_coupon_redemption;
CREATE TRIGGER apply_coupon_redemption AFTER INSERT ON coupon_redemptions BEGIN
  UPDATE coupons SET usage_count=usage_count+1,updated_at=CURRENT_TIMESTAMP WHERE id=NEW.coupon_id;
END;
