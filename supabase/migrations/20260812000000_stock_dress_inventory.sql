-- ============================================================
-- INVENTAURI — STOCK MODULE (schema v2)
-- 8 tables · standalone module · no dependency on orders
--
-- Design + reasoning: docs/stock-module-schema.md
-- Source layout:      details/product/product-page.excalidraw
--
-- v1 of this file was never pushed to production, so it is rewritten in
-- place rather than patched with ALTERs. Local only: `supabase db reset`.
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

-- v1 had a single `stock_status` enum (draft|available|reserved|sold|
-- archived) applied to BOTH products and variants. That conflated two
-- different things: whether a design is listed, and where a physical
-- garment is. Split here. `reserved` and `sold` are gone entirely —
-- quantity and stock_movements express those now.
CREATE TYPE product_status AS ENUM (
  'active',
  'draft',
  'archived'     -- retired design; never making it again
);

CREATE TYPE variant_status AS ENUM (
  'active',
  'archived'
);

CREATE TYPE variant_axis AS ENUM (
  'size',
  'color',
  'fabric',
  'other'
);

CREATE TYPE borrower_type AS ENUM (
  'karigar',
  'photographer',
  'vendor',
  'staff',
  'other'
);

CREATE TYPE stock_movement_reason AS ENUM (
  'received',         -- +  came into existence
  'sold',             -- -
  'customer_return',  -- +  customer brought it back
  'damaged',          -- -  written off
  'lost',             -- -  unaccounted for
  'adjustment',       -- ±  physical count correction
  'loaned_out',       -- -  shoot, karigar, trial, on approval
  'loan_return'       -- +  came back
);


-- ────────────────────────────────────────────────────────────
-- SHARED: updated_at maintenance
--
-- v1 declared updated_at but nothing ever wrote it, so it was just a
-- second copy of created_at.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────────────────
-- SKU NUMBERS
--
-- A SKU is an input: the user types one, or the frontend generates it from
-- the format saved in stock_settings (prefix, separator, digits). The
-- database never builds a SKU string. It only hands out the next number,
-- atomically, so two people creating dresses at once never get the same one.
-- Numbers can skip (a failed save still uses one); that is fine for a SKU.
-- ────────────────────────────────────────────────────────────

CREATE SEQUENCE stock_sku_seq START 1;

CREATE OR REPLACE FUNCTION next_stock_sku_number()
RETURNS BIGINT AS $$
  SELECT nextval('public.stock_sku_seq');
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION next_stock_sku_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION next_stock_sku_number() TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 1. STOCK DRESSES
-- ────────────────────────────────────────────────────────────

CREATE TABLE stock_dresses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku               TEXT UNIQUE CONSTRAINT sku_not_blank CHECK (btrim(sku) <> ''),
  name              TEXT NOT NULL,
  description       TEXT,
  notes             TEXT,
  garment_type      TEXT NOT NULL,
  category          stock_category NOT NULL,
  subcategory       stock_subcategory,
  tags              TEXT[] NOT NULL DEFAULT '{}',

  cost              NUMERIC(12,2),
  price             NUMERIC(12,2) NOT NULL,
  compare_at_price  NUMERIC(12,2),

  status            product_status NOT NULL DEFAULT 'draft',
  track_quantity    BOOLEAN NOT NULL DEFAULT true,
  made_to_order     BOOLEAN NOT NULL DEFAULT true,
  -- The dress's own count. Used when the dress has no variants. With variants
  -- it is kept underneath but hidden: each variant holds its own count
  -- (Shopify's behaviour). Only stock_movements' trigger writes it.
  quantity          INTEGER NOT NULL DEFAULT 0,

  weight_grams      INTEGER,
  length_cm         NUMERIC(6,2),
  width_cm          NUMERIC(6,2),
  height_cm         NUMERIC(6,2),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT subcategory_bridal_only CHECK (
    subcategory IS NULL OR category = 'bridal'
  ),

  CONSTRAINT compare_at_above_price CHECK (
    compare_at_price IS NULL OR compare_at_price > price
  ),

  -- A draft is allowed to be incomplete; anything a customer can be quoted
  -- is not. Enforced here rather than only in the form so every path —
  -- including Orders later — gets it.
  CONSTRAINT price_positive_unless_draft CHECK (
    status = 'draft' OR price > 0
  )
);

COMMENT ON TABLE stock_dresses IS
  'Dress designs. A design can be sold both ready-made (the physical sample) and made-to-order, so quantity and made_to_order are independent. F17.';
COMMENT ON COLUMN stock_dresses.sku IS
  'Optional. Typed by the user or generated by the frontend from stock_settings; never generated by the database. Unique when set.';
COMMENT ON COLUMN stock_dresses.cost IS
  'Internal only — never surface to any client-facing UI.';
COMMENT ON COLUMN stock_dresses.description IS
  'Customer-facing. Internal remarks belong in notes.';
COMMENT ON COLUMN stock_dresses.made_to_order IS
  'True means a sold-out design is still orderable — a new one gets made. Selling the only sample does not make the design unavailable.';
COMMENT ON COLUMN stock_dresses.compare_at_price IS
  'Struck-through "was" price, e.g. an ageing sample sold at a discount. Must exceed price. profit/margin are derived in the UI, never stored.';

CREATE TRIGGER touch_stock_dresses
BEFORE UPDATE ON stock_dresses
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


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
  'Cloudflare R2 public bucket URL — image bytes are never stored in Postgres. TODO(security): unvalidated today and rendered into <img src>; add an https + exact-R2-hostname CHECK once the bucket origin exists. See stockDressImagesService.js.';



-- ────────────────────────────────────────────────────────────
-- 3. STOCK DRESS OPTIONS
--
-- Variant or option? Does the finished thing exist before someone asks
-- for it? On the rack, countable → variant. Made once the customer
-- chooses → option. Price is not the test; variants vary in price too.
--
-- Golden Studio: size and colour are variants, dupatta style is an
-- option — the same design is never hung twice with different dupattas.
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
-- e.g. "Plain", "Hand-painted" under "Dupatta Style"
-- ────────────────────────────────────────────────────────────

CREATE TABLE stock_dress_option_values (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id         UUID NOT NULL REFERENCES stock_dress_options(id) ON DELETE CASCADE,
  value             TEXT NOT NULL,
  price_adjustment  NUMERIC(12,2) NOT NULL DEFAULT 0,
  image_url         TEXT,
  position          INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN stock_dress_option_values.price_adjustment IS
  'Added on top of the variant price when chosen, e.g. hand-painted dupatta +40000.';
COMMENT ON COLUMN stock_dress_option_values.image_url IS
  'Optional photo of this choice, so the customer can see what it looks like. Same rules as stock_dress_images.image_url: validate to https and the R2 host when upload lands.';


-- ────────────────────────────────────────────────────────────
-- 5. STOCK DRESS VARIANTS
-- Countable units. SKU + barcode + quantity.
-- ────────────────────────────────────────────────────────────

CREATE TABLE stock_dress_variants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dress_id        UUID NOT NULL REFERENCES stock_dresses(id) ON DELETE CASCADE,
  -- Optional. Typed by the user or generated by the frontend from
  -- stock_settings (dress SKU + option values); never by the database.
  sku             TEXT UNIQUE CONSTRAINT sku_not_blank CHECK (btrim(sku) <> ''),
  barcode         TEXT UNIQUE,
  price_override  NUMERIC(12,2),
  compare_at_price NUMERIC(12,2),
  cost            NUMERIC(12,2),
  track_quantity  BOOLEAN NOT NULL DEFAULT true,
  quantity        INTEGER NOT NULL DEFAULT 0,
  weight_grams    INTEGER,
  length_cm       NUMERIC(6,2),
  width_cm        NUMERIC(6,2),
  height_cm       NUMERIC(6,2),
  status          variant_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Images of a variant's own variant page. Null variant_id = a dress photo.
ALTER TABLE stock_dress_images
  ADD COLUMN variant_id UUID REFERENCES stock_dress_variants(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX one_primary_per_dress
ON stock_dress_images(dress_id)
WHERE is_primary = true AND variant_id IS NULL;

CREATE UNIQUE INDEX one_primary_per_variant
ON stock_dress_images(variant_id)
WHERE is_primary = true AND variant_id IS NOT NULL;

COMMENT ON COLUMN stock_dress_variants.price_override IS
  'Overrides the parent dress price when set; null means use the parent price.';
COMMENT ON COLUMN stock_dress_variants.compare_at_price IS
  'Per-variant struck-through price. Null means no compare-at for this variant.';
COMMENT ON COLUMN stock_dress_variants.cost IS
  'Per-variant internal cost. Null means use the parent dress cost.';
COMMENT ON COLUMN stock_dress_variants.track_quantity IS
  'Per-variant: off means this variant is never counted. Independent of the dress-level flag.';
COMMENT ON COLUMN stock_dress_variants.weight_grams IS
  'Per-variant weight for the courier. Null means use the parent dress weight.';
COMMENT ON COLUMN stock_dress_variants.quantity IS
  'Cached running total. ONLY stock_movements'' trigger writes this — never update it directly, or it will disagree with the ledger.';
COMMENT ON COLUMN stock_dress_variants.barcode IS
  'Code128 payload, rendered client-side. Defaults to the SKU and is then frozen: once a label is printed and sewn into a garment, a barcode that changed underneath it would stop matching. Editable by hand.';

CREATE TRIGGER touch_stock_dress_variants
BEFORE UPDATE ON stock_dress_variants
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


-- ────────────────────────────────────────────────────────────
-- 6. STOCK DRESS VARIANT VALUES
-- Which axis values make up each variant, e.g. size=M, color=Red
-- ────────────────────────────────────────────────────────────

CREATE TABLE stock_dress_variant_values (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id      UUID NOT NULL REFERENCES stock_dress_variants(id) ON DELETE CASCADE,
  axis            variant_axis NOT NULL,
  value           TEXT NOT NULL,

  UNIQUE (variant_id, axis)
);


-- ────────────────────────────────────────────────────────────
-- VARIANT BARCODE DEFAULT
--
-- A blank barcode takes the variant's SKU. It is only filled when empty,
-- never rewritten: a label already printed and sewn into a garment must keep
-- matching, even if the SKU is renamed later.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION default_stock_variant_barcode()
RETURNS TRIGGER AS $$
BEGIN
  NEW.barcode := COALESCE(NULLIF(NEW.barcode, ''), NEW.sku);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER default_variant_barcode
BEFORE INSERT OR UPDATE ON stock_dress_variants
FOR EACH ROW EXECUTE FUNCTION default_stock_variant_barcode();


-- ────────────────────────────────────────────────────────────
-- 7. STOCK BORROWERS
--
-- Who may take a sample off the rack. A controlled list rather than free
-- text: "Aslam" / "aslam" / "Aslam karigar" as three separate people
-- would make "what does Aslam have right now" silently wrong.
--
-- Managed from Settings. Likely folds into F10 Contacts later — a dozen
-- rows, so that merge is cheap.
-- ────────────────────────────────────────────────────────────

CREATE TABLE stock_borrowers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT,
  cnic        TEXT,
  type        borrower_type NOT NULL,
  note        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT cnic_format CHECK (
    cnic IS NULL OR cnic ~ '^[0-9]{5}-?[0-9]{7}-?[0-9]$'
  )
);

COMMENT ON COLUMN stock_borrowers.cnic IS
  'National ID. PREREQUISITE: do not store real CNICs until Auth ships and RLS is staff-scoped — today RLS is TO authenticated (any Supabase user) and seed.sql grants anon locally. Fine for fake data, not for identity data.';
COMMENT ON COLUMN stock_borrowers.is_active IS
  'Deactivate rather than delete: drops them from the dropdown while keeping their loan history readable.';


-- ────────────────────────────────────────────────────────────
-- 8. STOCK MOVEMENTS
--
-- Append-only ledger. Every row answers: what happened to this dress,
-- and why. A plain counter cannot tell "sold forever" from "at a
-- photographer's since Tuesday" — both read 0.
-- ────────────────────────────────────────────────────────────

CREATE TABLE stock_movements (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dress_id             UUID NOT NULL REFERENCES stock_dresses(id)
                            ON DELETE RESTRICT,
  -- Null only for a dress with no variants (see apply_stock_movement).
  variant_id           UUID REFERENCES stock_dress_variants(id)
                            ON DELETE RESTRICT,
  delta                INTEGER NOT NULL,
  reason               stock_movement_reason NOT NULL,

  borrower_id          UUID REFERENCES stock_borrowers(id) ON DELETE RESTRICT,
  expected_return_at   DATE,
  resolves_movement_id UUID REFERENCES stock_movements(id),

  note                 TEXT,
  created_by           UUID,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT delta_not_zero CHECK (delta <> 0),

  CONSTRAINT delta_sign_matches_reason CHECK (
    (reason IN ('received','customer_return','loan_return') AND delta > 0) OR
    (reason IN ('sold','damaged','lost','loaned_out')       AND delta < 0) OR
    (reason = 'adjustment')
  ),

  CONSTRAINT custody_only_on_loans CHECK (
    reason = 'loaned_out'
    OR (borrower_id IS NULL AND expected_return_at IS NULL)
  ),

  CONSTRAINT resolution_only_on_returns CHECK (
    resolves_movement_id IS NULL OR reason = 'loan_return'
  )
);

COMMENT ON TABLE stock_movements IS
  'Append-only stock ledger. Corrections are posted as adjustment rows, never by editing history. Gains a nullable order_id when Orders ships — rows written before then correctly have none, so there is nothing to backfill.';
COMMENT ON COLUMN stock_movements.created_by IS
  'Staff FK once Auth ships. Null until then.';
COMMENT ON COLUMN stock_movements.resolves_movement_id IS
  'On a loan_return, points at the loaned_out row it closes. Open loans are loaned_out rows nothing points back at.';

-- A loan can only be closed once.
CREATE UNIQUE INDEX one_return_per_loan
  ON stock_movements(resolves_movement_id)
  WHERE resolves_movement_id IS NOT NULL;


-- ────────────────────────────────────────────────────────────
-- LEDGER → CACHED QUANTITY
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION apply_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.variant_id IS NULL THEN
    -- Allowed even with variants: the dress count is stored and hidden, not summed.
    NULL;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM stock_dress_variants
      WHERE id = NEW.variant_id AND dress_id = NEW.dress_id
    ) THEN
      RAISE EXCEPTION 'variant does not belong to this dress';
    END IF;
    UPDATE stock_dress_variants
    SET quantity = quantity + NEW.delta
    WHERE id = NEW.variant_id;
    RETURN NEW;
  END IF;

  UPDATE stock_dresses
  SET quantity = quantity + NEW.delta
  WHERE id = NEW.dress_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER apply_movement_to_quantity
AFTER INSERT ON stock_movements
FOR EACH ROW EXECUTE FUNCTION apply_stock_movement();


-- ────────────────────────────────────────────────────────────
-- APPEND-ONLY ENFORCEMENT
-- A ledger you can edit is not a ledger.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION reject_movement_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'stock_movements is append-only — post a correcting "adjustment" row instead of editing or deleting history';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_movements_append_only
BEFORE UPDATE OR DELETE ON stock_movements
FOR EACH ROW EXECUTE FUNCTION reject_movement_mutation();


-- ────────────────────────────────────────────────────────────
-- OPEN LOANS VIEW
-- Samples currently off the rack. Add
-- `WHERE expected_return_at < CURRENT_DATE` for an overdue list.
-- ────────────────────────────────────────────────────────────

CREATE VIEW stock_open_loans AS
SELECT
  m.id              AS movement_id,
  m.variant_id,
  v.sku             AS variant_sku,
  d.id              AS dress_id,
  d.name            AS dress_name,
  b.id              AS borrower_id,
  b.name            AS borrower_name,
  b.type            AS borrower_type,
  b.phone           AS borrower_phone,
  m.expected_return_at,
  m.note,
  m.created_at      AS loaned_at
FROM stock_movements m
JOIN stock_dresses d        ON d.id = m.dress_id
LEFT JOIN stock_dress_variants v ON v.id = m.variant_id
LEFT JOIN stock_borrowers b ON b.id = m.borrower_id
WHERE m.reason = 'loaned_out'
  AND NOT EXISTS (
    SELECT 1 FROM stock_movements r
    WHERE r.resolves_movement_id = m.id
  );


-- ────────────────────────────────────────────────────────────
-- STOCK SETTINGS
-- One row (id is always true). Holds the SKU format today; further stock
-- settings become columns here. See docs/settings.md.
-- ────────────────────────────────────────────────────────────

CREATE TABLE stock_settings (
  id                BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  sku_autogenerate  BOOLEAN NOT NULL DEFAULT true,
  sku_prefix        TEXT NOT NULL DEFAULT 'GSP' CHECK (sku_prefix ~ '^[A-Z0-9]{0,10}$'),
  sku_separator     TEXT NOT NULL DEFAULT '-' CHECK (sku_separator IN ('-', '_', '.')),
  sku_digits        INTEGER NOT NULL DEFAULT 5 CHECK (sku_digits BETWEEN 1 AND 10),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO stock_settings DEFAULT VALUES;

COMMENT ON COLUMN stock_settings.sku_autogenerate IS
  'On: the frontend generates a SKU when none is typed. Off: nothing is generated and SKUs are optional.';

CREATE TRIGGER touch_stock_settings
BEFORE UPDATE ON stock_settings
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────

CREATE INDEX idx_stock_dresses_category     ON stock_dresses(category);
CREATE INDEX idx_stock_dresses_status       ON stock_dresses(status);
CREATE INDEX idx_stock_dresses_garment      ON stock_dresses(garment_type);
CREATE INDEX idx_stock_dresses_tags         ON stock_dresses USING GIN(tags);
CREATE INDEX idx_stock_images_dress         ON stock_dress_images(dress_id);
CREATE INDEX idx_stock_images_primary       ON stock_dress_images(dress_id, is_primary);
CREATE INDEX idx_stock_options_dress        ON stock_dress_options(dress_id);
CREATE INDEX idx_stock_option_values_option ON stock_dress_option_values(option_id);
CREATE INDEX idx_stock_variants_dress       ON stock_dress_variants(dress_id);
CREATE INDEX idx_stock_variants_status      ON stock_dress_variants(status);
CREATE INDEX idx_stock_variants_barcode     ON stock_dress_variants(barcode);
CREATE INDEX idx_stock_variant_values       ON stock_dress_variant_values(variant_id);
CREATE INDEX idx_stock_borrowers_active     ON stock_borrowers(is_active);
CREATE INDEX idx_stock_movements_variant    ON stock_movements(variant_id, created_at DESC);
CREATE INDEX idx_stock_movements_dress      ON stock_movements(dress_id, created_at DESC);
CREATE INDEX idx_stock_movements_reason     ON stock_movements(reason);
CREATE INDEX idx_stock_movements_borrower   ON stock_movements(borrower_id);


-- ────────────────────────────────────────────────────────────
-- ROW-LEVEL SECURITY
--
-- NOTE: there is no staff/auth table yet (Auth is the next module). Until
-- then RLS is enabled but scoped to "any authenticated Supabase user"
-- rather than "authenticated AND studio staff". There is no other user
-- base today, but this MUST be tightened once Auth ships — especially for
-- stock_borrowers, which holds CNICs. Anonymous access is denied outright.
-- ────────────────────────────────────────────────────────────

ALTER TABLE stock_dresses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_dress_images          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_dress_options         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_dress_option_values   ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_dress_variants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_dress_variant_values  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_borrowers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_settings              ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Authenticated users can read stock borrowers"
  ON stock_borrowers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write stock borrowers"
  ON stock_borrowers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Movements are insert + read only. The append-only trigger also blocks
-- UPDATE/DELETE, but there is no reason to grant them in the first place.
CREATE POLICY "Authenticated users can read stock movements"
  ON stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can record stock movements"
  ON stock_movements FOR INSERT TO authenticated WITH CHECK (true);

-- The single row is seeded above, so there is no insert or delete policy.
-- TODO(security): any signed-in user can change the SKU format. Restrict to
-- admins once roles exist.
CREATE POLICY "Authenticated users can read stock settings"
  ON stock_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update stock settings"
  ON stock_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
