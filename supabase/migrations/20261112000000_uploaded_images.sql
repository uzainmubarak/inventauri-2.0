-- The photo gallery: one row per file in the R2 bucket. content_hash (SHA-256 of
-- the bytes) is unique, so the same picture is never stored twice, whatever it is
-- called. url is what stock_dress_images.image_url and option values point at.
CREATE TABLE uploaded_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash  TEXT NOT NULL UNIQUE CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  r2_key        TEXT NOT NULL UNIQUE,
  url           TEXT NOT NULL CHECK (url ~ '^https://'),
  file_name     TEXT,
  content_type  TEXT,
  size_bytes    BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE uploaded_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read uploaded images"
  ON uploaded_images FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write uploaded images"
  ON uploaded_images FOR ALL TO authenticated USING (true) WITH CHECK (true);
