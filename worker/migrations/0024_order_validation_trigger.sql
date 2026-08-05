DROP TRIGGER IF EXISTS validate_order_transition;
CREATE TRIGGER validate_order_transition BEFORE INSERT ON order_transitions BEGIN
  SELECT RAISE(ABORT,'ORDER_STATE_CONFLICT') WHERE NOT EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status=NEW.from_status);
  SELECT RAISE(ABORT,'INVALID_ORDER_TRANSITION') WHERE NOT ((NEW.from_status='pending' AND NEW.to_status IN ('confirmed','cancelled')) OR (NEW.from_status='confirmed' AND NEW.to_status IN ('packed','cancelled')) OR (NEW.from_status='packed' AND NEW.to_status IN ('shipped','cancelled')) OR (NEW.from_status='shipped' AND NEW.to_status IN ('delivered','returned')) OR (NEW.from_status='delivered' AND NEW.to_status IN ('returned','refunded')) OR (NEW.from_status='returned' AND NEW.to_status='refunded'));
END;
