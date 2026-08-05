DROP TRIGGER IF EXISTS prevent_duplicate_active_return;
CREATE TRIGGER prevent_duplicate_active_return BEFORE INSERT ON returns WHEN EXISTS(SELECT 1 FROM returns WHERE order_id=NEW.order_id AND status IN ('pending','approved')) BEGIN
  SELECT RAISE(ABORT,'RETURN_ALREADY_EXISTS');
END;
