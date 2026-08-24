-- ============================================================
-- INVENTAURI — STOCK DRESS MODULE
-- 6 tables · standalone module · no dependency on orders
-- See docs/inventauri_requirements.md §7a.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────

CREATE TYPE stock_category AS ENUM (
  'party_wear',
  'formals',
  'bridal',
  'nikkah_wear'
);

CREATE TYPE stock_subcategory AS ENUM (
  'mehendi',
  'barat',
  'walima'
);

CREATE TYPE stock_status AS ENUM (
  'draft',
  'available',
  'reserved',
  'sold',
  'archived'
);

CREATE TYPE variant_axis AS ENUM (
  'size',
  'color',
  'fabric',
  'other'
);


-- ────────────────────────────────────────────────────────────
-- SKU SEQUENCE + TRIGGER
-- ────────────────────────────────────────────────────────────

CREATE SEQUENCE stock_sku_seq START 1;

CREATE OR REPLACE FUNCTION generate_stock_sku()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    NEW.sku := 'GSP-' || LPAD(nextval('stock_sku_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────────────────
-- 1. STOCK DRESSES
-- ────────────────────────────────────────────────────────────

CREATE TABLE stock_dresses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku               TEXT UNIQUE NOT NULL DEFAULT '',
  name              TEXT NOT NULL,
  garment_type      TEXT NOT NULL,
  category          stock_category NOT NULL,
  subcategory       stock_subcategory,
  base_price        NUMERIC(12,2) NOT NULL,
  production_cost   NUMERIC(12,2),
  status            stock_status NOT NULL DEFAULT 'available',
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT subcategory_bridal_only CHECK (
    subcategory IS NULL OR category = 'bridal'
  )
);

COMMENT ON TABLE stock_dresses IS
  'Finished ready-made dresses physically available for sale (not made-to-order production). F17.';
COMMENT ON COLUMN stock_dresses.production_cost IS
  'Internal only — do not surface to any client-facing UI.';

CREATE TRIGGER set_stock_sku
BEFORE INSERT ON stock_dresses
FOR EACH ROW EXECUTE FUNCTION generate_stock_sku();


-- ────────────────────────────────────────────────────────────
-- 2. STOCK DRESS IMAGES
-- ────────────────────────────────────────────────────────────

CREATE TABLE stock_dress_images (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dress_id        UUID NOT NULL REFERENCES stock_dresses(id) ON DELETE CASCADE,
  image_url       TEXT NOT NULL,
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  caption         TEXT,
  position        INTEGER NOT NULL DEFAULT 0,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN stock_dress_images.image_url IS
  'Cloudflare R2 public bucket URL — image bytes are never stored in Postgres.';

CREATE UNIQUE INDEX one_primary_per_dress
ON stock_dress_images(dress_id)
WHERE is_primary = true;


-- ────────────────────────────────────────────────────────────
-- 3. STOCK DRESS OPTIONS
-- Client choices at order time — not stocked, not SKU'd
-- e.g. "Dupatta Style", "Sleeve Type"
-- ────────────────────────────────────────────────────────────

CREATE TABLE stock_dress_options (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dress_id        UUID NOT NULL REFERENCES stock_dresses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  position        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 4. STOCK DRESS OPTION VALUES
-- e.g. "Plain", "Painted", "Spray" under "Dupatta Style"
-- ────────────────────────────────────────────────────────────

CREATE TABLE stock_dress_option_values (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id         UUID NOT NULL REFERENCES stock_dress_options(id) ON DELETE CASCADE,
  value             TEXT NOT NULL,
  price_adjustment  NUMERIC(12,2) NOT NULL DEFAULT 0,
  position          INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 5. STOCK DRESS VARIANTS
-- Stockable units with SKU, quantity, price, status
-- Custom = GSP-00001 (no suffix, make-to-order, qty NULL)
-- Sized  = GSP-00001-S, GSP-00001-M etc.
-- ────────────────────────────────────────────────────────────

CREATE TABLE stock_dress_variants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dress_id        UUID NOT NULL REFERENCES stock_dresses(id) ON DELETE CASCADE,
  -- Nullable + no default: a variant is created before its axis values are
  -- known (stock_dress_variant_values rows reference this variant's id via
  -- FK, so they can only be inserted afterward). The SKU is filled in by
  -- refresh_stock_variant_sku(), triggered from stock_dress_variant_values
  -- once at least one axis value exists. See that trigger below.
  sku             TEXT UNIQUE,
  price_override  NUMERIC(12,2),
  quantity        INTEGER,
  status          stock_status NOT NULL DEFAULT 'available',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN stock_dress_variants.price_override IS
  'Overrides the parent dress base_price when set; null means use base price.';
COMMENT ON COLUMN stock_dress_variants.sku IS
  'Auto-generated from the parent dress SKU + this variant''s axis values (see refresh_stock_variant_sku()). Null until at least one axis value is attached.';


-- ────────────────────────────────────────────────────────────
-- 6. STOCK DRESS VARIANT VALUES
-- Which axis values make up each variant
-- e.g. size=Small, color=Red
-- ────────────────────────────────────────────────────────────

CREATE TABLE stock_dress_variant_values (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id      UUID NOT NULL REFERENCES stock_dress_variants(id) ON DELETE CASCADE,
  axis            variant_axis NOT NULL,
  value           TEXT NOT NULL,

  UNIQUE (variant_id, axis)
);


-- ────────────────────────────────────────────────────────────
-- VARIANT SKU GENERATION
--
-- A variant's SKU is derived from its parent dress's SKU plus all of its
-- axis values, e.g. dress GSP-00001 + {size: M} → GSP-00001-M,
-- + {size: M, color: Red} → GSP-00001-M-RED (axes joined in a fixed order —
-- alphabetical by axis name — so the same combination always produces the
-- same SKU regardless of insert order). A variant with zero axis values
-- (the "Custom" case) keeps the bare dress SKU, e.g. GSP-00001.
--
-- Fires on stock_dress_variant_values, not stock_dress_variants, because
-- axis values are only known after the variant row already exists (they
-- reference it by FK). Recomputes on insert, update, and delete so the SKU
-- always reflects current axis values.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION refresh_stock_variant_sku()
RETURNS TRIGGER AS $$
DECLARE
  target_variant_id UUID;
  dress_sku TEXT;
  suffix TEXT;
BEGIN
  target_variant_id := COALESCE(NEW.variant_id, OLD.variant_id);

  SELECT d.sku INTO dress_sku
  FROM stock_dress_variants v
  JOIN stock_dresses d ON d.id = v.dress_id
  WHERE v.id = target_variant_id;

  SELECT string_agg(upper(value), '-' ORDER BY axis::TEXT, value)
  INTO suffix
  FROM stock_dress_variant_values
  WHERE variant_id = target_variant_id;

  UPDATE stock_dress_variants
  SET sku = CASE WHEN suffix IS NULL THEN dress_sku ELSE dress_sku || '-' || suffix END
  WHERE id = target_variant_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refresh_variant_sku_on_value_change ON stock_dress_variant_values;
CREATE TRIGGER refresh_variant_sku_on_value_change
AFTER INSERT OR UPDATE OR DELETE ON stock_dress_variant_values
FOR EACH ROW EXECUTE FUNCTION refresh_stock_variant_sku();


-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────

CREATE INDEX idx_stock_dresses_category     ON stock_dresses(category);
CREATE INDEX idx_stock_dresses_status       ON stock_dresses(status);
CREATE INDEX idx_stock_dresses_garment      ON stock_dresses(garment_type);
CREATE INDEX idx_stock_images_dress         ON stock_dress_images(dress_id);
CREATE INDEX idx_stock_images_primary       ON stock_dress_images(dress_id, is_primary);
CREATE INDEX idx_stock_options_dress        ON stock_dress_options(dress_id);
CREATE INDEX idx_stock_option_values_option ON stock_dress_option_values(option_id);
CREATE INDEX idx_stock_variants_dress       ON stock_dress_variants(dress_id);
CREATE INDEX idx_stock_variants_status      ON stock_dress_variants(status);
CREATE INDEX idx_stock_variant_values       ON stock_dress_variant_values(variant_id);


-- ────────────────────────────────────────────────────────────
-- ROW-LEVEL SECURITY
--
-- NOTE: this project has no `staff`/auth table yet (Auth module comes right
-- after Stock). Until then, RLS is enabled but scoped to "any authenticated
-- Supabase user" rather than "authenticated AND is studio staff" — there is
-- currently no other user base, but this MUST be tightened to check against
-- the staff table once Auth ships. Anonymous (anon key, logged-out) access
-- is denied outright either way.
-- ────────────────────────────────────────────────────────────

ALTER TABLE stock_dresses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_dress_images          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_dress_options         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_dress_option_values   ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_dress_variants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_dress_variant_values  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stock dresses"
  ON stock_dresses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write stock dresses"
  ON stock_dresses FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read stock dress images"
  ON stock_dress_images FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write stock dress images"
  ON stock_dress_images FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read stock dress options"
  ON stock_dress_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write stock dress options"
  ON stock_dress_options FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read stock dress option values"
  ON stock_dress_option_values FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write stock dress option values"
  ON stock_dress_option_values FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read stock dress variants"
  ON stock_dress_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write stock dress variants"
  ON stock_dress_variants FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read stock dress variant values"
  ON stock_dress_variant_values FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write stock dress variant values"
  ON stock_dress_variant_values FOR ALL TO authenticated USING (true) WITH CHECK (true);
