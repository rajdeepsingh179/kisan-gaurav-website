DROP TRIGGER IF EXISTS queue_deleted_media_objects;
CREATE TRIGGER queue_deleted_media_objects AFTER DELETE ON media_assets BEGIN
  INSERT INTO media_deletion_queue(asset_id,object_key,thumbnail_key)
  VALUES(OLD.id,OLD.key,OLD.thumbnail_key)
  ON CONFLICT(asset_id) DO UPDATE SET object_key=excluded.object_key,thumbnail_key=excluded.thumbnail_key,updated_at=CURRENT_TIMESTAMP;
END;
