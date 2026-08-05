DROP TRIGGER IF EXISTS apply_order_transition;
CREATE TRIGGER apply_order_transition AFTER INSERT ON order_transitions BEGIN
  UPDATE orders SET status=NEW.to_status,tracking_number=COALESCE(NEW.tracking_number,tracking_number),updated_at=CURRENT_TIMESTAMP WHERE id=NEW.order_id;
  INSERT INTO order_status_history(id,order_id,status,note,created_at) VALUES(NEW.id,NEW.order_id,NEW.to_status,NEW.note,NEW.created_at);
END;
