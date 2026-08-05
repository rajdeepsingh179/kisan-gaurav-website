DROP TRIGGER IF EXISTS apply_inventory_mutation;
CREATE TRIGGER apply_inventory_mutation AFTER INSERT ON inventory_mutations BEGIN
  UPDATE product_variants SET stock=CASE WHEN NEW.mutation_type='set' THEN NEW.quantity ELSE stock+NEW.quantity END,updated_at=CURRENT_TIMESTAMP WHERE id=NEW.variant_id;
  INSERT INTO inventory_history(id,variant_id,change_quantity,balance_after,reason,reference_id,actor_user_id,created_at)
  SELECT NEW.id,NEW.variant_id,CASE WHEN NEW.mutation_type='set' THEN NEW.quantity-NEW.expected_stock ELSE NEW.quantity END,stock,NEW.reason,NEW.reference_id,NEW.actor_user_id,NEW.created_at FROM product_variants WHERE id=NEW.variant_id;
END;
