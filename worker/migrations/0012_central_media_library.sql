ALTER TABLE media_assets ADD COLUMN thumbnail_key TEXT;
ALTER TABLE media_assets ADD COLUMN thumbnail_url TEXT;

CREATE INDEX IF NOT EXISTS idx_media_created_at ON media_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_mime_type ON media_assets(mime_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_file_name ON media_assets(file_name);
