-- ============================================================
-- LOCAL DEV SEED — runs only on `supabase db reset` / local `start`.
-- Never applied by `supabase db push` and never touches production.
--
-- Purpose: temporarily allow the `anon` role to read/write the stock_*
-- tables so the Stock UI can be built and tested before Auth exists.
-- Production RLS policies (authenticated-only) stay untouched — this only
-- ADDS an extra local policy on top, it does not weaken the real ones.
--
-- DELETE THIS FILE (or just these policies/grants) once Auth ships and the
-- app logs in for real — at that point anon access should stay blocked
-- everywhere, local included, so dev parity matches production.
-- ============================================================

-- RLS policies only apply on top of base table-level privileges — Supabase
-- grants nothing to `anon` by default, so without this, even a permissive
-- "TO anon" policy below is never reached (blocked one layer earlier).
GRANT SELECT, INSERT, UPDATE, DELETE ON
  stock_dresses,
  stock_dress_images,
  stock_dress_options,
  stock_dress_option_values,
  stock_dress_variants,
  stock_dress_variant_values,
  stock_borrowers,
  stock_movements
TO anon;

CREATE POLICY "DEV ONLY: anon can read stock dresses"
  ON stock_dresses FOR SELECT TO anon USING (true);
CREATE POLICY "DEV ONLY: anon can write stock dresses"
  ON stock_dresses FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "DEV ONLY: anon can read stock dress images"
  ON stock_dress_images FOR SELECT TO anon USING (true);
CREATE POLICY "DEV ONLY: anon can write stock dress images"
  ON stock_dress_images FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "DEV ONLY: anon can read stock dress options"
  ON stock_dress_options FOR SELECT TO anon USING (true);
CREATE POLICY "DEV ONLY: anon can write stock dress options"
  ON stock_dress_options FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "DEV ONLY: anon can read stock dress option values"
  ON stock_dress_option_values FOR SELECT TO anon USING (true);
CREATE POLICY "DEV ONLY: anon can write stock dress option values"
  ON stock_dress_option_values FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "DEV ONLY: anon can read stock dress variants"
  ON stock_dress_variants FOR SELECT TO anon USING (true);
CREATE POLICY "DEV ONLY: anon can write stock dress variants"
  ON stock_dress_variants FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "DEV ONLY: anon can read stock dress variant values"
  ON stock_dress_variant_values FOR SELECT TO anon USING (true);
CREATE POLICY "DEV ONLY: anon can write stock dress variant values"
  ON stock_dress_variant_values FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "DEV ONLY: anon can read stock borrowers"
  ON stock_borrowers FOR SELECT TO anon USING (true);
CREATE POLICY "DEV ONLY: anon can write stock borrowers"
  ON stock_borrowers FOR ALL TO anon USING (true) WITH CHECK (true);

-- Movements are insert + read only, mirroring the authenticated policies.
CREATE POLICY "DEV ONLY: anon can read stock movements"
  ON stock_movements FOR SELECT TO anon USING (true);
CREATE POLICY "DEV ONLY: anon can record stock movements"
  ON stock_movements FOR INSERT TO anon WITH CHECK (true);
