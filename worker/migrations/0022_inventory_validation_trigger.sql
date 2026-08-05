DROP TRIGGER IF EXISTS validate_inventory_mutation;
CREATE TRIGGER validate_inventory_mutation BEFORE INSERT ON inventory_mutations BEGIN
  SELECT RAISE(ABORT,'VARIANT_NOT_AVAILABLE') WHERE NOT EXISTS(SELECT 1 FROM product_variants WHERE id=NEW.variant_id);
  SELECT RAISE(ABORT,'VARIANT_NOT_AVAILABLE') WHERE EXISTS(SELECT 1 FROM product_variants WHERE id=NEW.variant_id AND archived=1) AND (NEW.mutation_type='set' OR NEW.quantity<0);
  SELECT RAISE(ABORT,'INVENTORY_CONFLICT') WHERE NEW.mutation_type='set' AND (NEW.expected_stock IS NULL OR NEW.quantity<0 OR NOT EXISTS(SELECT 1 FROM product_variants WHERE id=NEW.variant_id AND stock=NEW.expected_stock));
  SELECT RAISE(ABORT,'INSUFFICIENT_STOCK') WHERE NEW.mutation_type='delta' AND (NEW.quantity=0 OR NOT EXISTS(SELECT 1 FROM product_variants WHERE id=NEW.variant_id AND stock+NEW.quantity>=0));
END;
