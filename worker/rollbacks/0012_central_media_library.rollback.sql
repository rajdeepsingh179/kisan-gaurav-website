DROP INDEX IF EXISTS idx_media_file_name;
DROP INDEX IF EXISTS idx_media_mime_type;
DROP INDEX IF EXISTS idx_media_created_at;

-- D1/SQLite supports DROP COLUMN on current runtimes. Apply only when rolling
-- back the matching migration and after confirming no application code reads
-- thumbnail_key or thumbnail_url.
ALTER TABLE media_assets DROP COLUMN thumbnail_url;
ALTER TABLE media_assets DROP COLUMN thumbnail_key;
