# Stock Dress Inventory UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Stock Dress Inventory catalog UI (F17) — a responsive card-grid catalog of finished ready-made dresses with full CRUD, filters/search, and a mobile bottom-tab navigation shell — replacing the current `staff`/test placeholder homepage.

**Architecture:** SvelteKit route (`src/routes/stock/`) backed by five new Supabase service files following the existing `staffService.js`/`stockDressesService.js` convention (each function returns `{ data, error }`). Six new Svelte components handle the grid, cards, filters, form, drawer, and variant list, all reflowing via CSS media queries at 768px/1024px rather than separate mobile routes. A new `MobileTabBar.svelte` renders alongside the existing `Sidebar.svelte` in `+layout.svelte`, toggled by media query.

**Tech Stack:** Svelte 5 (runes: `$state`, `$props`, `$effect`, `$derived`), SvelteKit (SPA mode, `adapter-static`), Supabase JS client, existing hand-rolled CSS design system (`src/app.css` custom properties — no component library).

**No automated test framework exists in this project** (verified: no vitest/testing-library/playwright in `package.json`, no `.test.`/`.spec.` files anywhere). Verification throughout this plan is manual: run the local Supabase stack (`supabase start`), run the dev server (`bun run dev` or `npx vite dev`), and check behavior directly in the Browser tool at each of the three breakpoints (375px mobile / 768px tablet / 1024px+ desktop), matching the project's existing verification practice (see `docs/superpowers/specs/2026-08-24-stock-dress-inventory-ui-design.md`).

---

## Pre-flight: environment check

Before Task 1, confirm local Supabase is running and has the Stock schema:

```bash
cd /Users/mac/ubm/projects/pos/frontend
supabase status
```

Expected: a JSON/table block with `API_URL: http://127.0.0.1:54321`. If it errors with "not running", run `supabase start` first (takes 10-30s once images are cached).

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\dt public.stock_*"
```

Expected: 6 rows (`stock_dresses`, `stock_dress_images`, `stock_dress_options`, `stock_dress_option_values`, `stock_dress_variants`, `stock_dress_variant_values`). If missing, run `supabase db reset` to reapply the migration + seed.

Confirm `.env.local` points at local Supabase, not production:

```bash
cat .env.local
```

Expected: `PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`. If it shows a `*.supabase.co` URL, something reverted it — stop and fix before proceeding (do not build/test against production).

---

### Task 1: Extend `stockDressesService.js` with update/archive

**Files:**
- Modify: `src/lib/services/stockDressesService.js`

- [ ] **Step 1: Add `updateStockDress` and `archiveStockDress`**

Append to the end of `src/lib/services/stockDressesService.js`:

```js
/**
 * Update fields on an existing stock dress. Never pass `sku` — it is
 * database-generated and immutable after creation.
 * @param {string} id
 * @param {{ name?: string, garment_type?: string, category?: string, subcategory?: string | null, base_price?: number, production_cost?: number | null, notes?: string | null, status?: string }} updates
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function updateStockDress(id, updates) {
	const { data, error } = await supabase
		.from("stock_dresses")
		.update(updates)
		.eq("id", id)
		.select()
		.single();

	if (error) {
		console.error("updateStockDress failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * Soft-delete: sets status to 'archived'. Never hard-deletes a dress —
 * matches the Available/Reserved/Sold/Archived lifecycle in the schema.
 * @param {string} id
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function archiveStockDress(id) {
	return updateStockDress(id, { status: "archived" });
}
```

- [ ] **Step 2: Manually verify via psql**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
INSERT INTO stock_dresses (name, garment_type, category, base_price)
VALUES ('Task 1 test dress', 'Kurti', 'formals', 5000)
RETURNING id;"
```

Copy the returned `id`, then in the running dev server's browser console (or a throwaway script), confirm `updateStockDress` and `archiveStockDress` work — this gets exercised for real once the form/drawer call them in Task 5/6, so a full manual check here is optional; the important thing is the code compiles and matches the existing function shape. Clean up:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "TRUNCATE stock_dresses CASCADE;"
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/stockDressesService.js
git commit -m "feat: add update/archive to stockDressesService"
```

---

### Task 2: Create `stockDressImagesService.js`

**Files:**
- Create: `src/lib/services/stockDressImagesService.js`

- [ ] **Step 1: Write the service file**

```js
// Service layer for the `stock_dress_images` table (F17).
// See docs/inventauri_requirements.md §7a.

import { supabase } from "$lib/supabaseClient";

/**
 * Fetch all images for a dress, ordered by sort position.
 * @param {string} dressId
 * @returns {Promise<{ data: any[] | null, error: string | null }>}
 */
export async function listImagesForDress(dressId) {
	const { data, error } = await supabase
		.from("stock_dress_images")
		.select("*")
		.eq("dress_id", dressId)
		.order("position", { ascending: true });

	if (error) {
		console.error("listImagesForDress failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * Add an image (URL only — no file upload in this pass, see design spec).
 * @param {{ dress_id: string, image_url: string, is_primary?: boolean, caption?: string, position?: number }} image
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function addImage(image) {
	const { data, error } = await supabase
		.from("stock_dress_images")
		.insert(image)
		.select()
		.single();

	if (error) {
		console.error("addImage failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * Mark one image as primary. The DB has a unique partial index enforcing
 * only one primary per dress, so the old primary must be cleared first.
 * @param {string} dressId
 * @param {string} imageId
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function setPrimaryImage(dressId, imageId) {
	const { error: clearError } = await supabase
		.from("stock_dress_images")
		.update({ is_primary: false })
		.eq("dress_id", dressId)
		.eq("is_primary", true);

	if (clearError) {
		console.error("setPrimaryImage (clear) failed:", clearError.message);
		return { data: null, error: clearError.message };
	}

	const { data, error } = await supabase
		.from("stock_dress_images")
		.update({ is_primary: true })
		.eq("id", imageId)
		.select()
		.single();

	if (error) {
		console.error("setPrimaryImage (set) failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * @param {string} imageId
 * @returns {Promise<{ data: null, error: string | null }>}
 */
export async function deleteImage(imageId) {
	const { error } = await supabase.from("stock_dress_images").delete().eq("id", imageId);

	if (error) {
		console.error("deleteImage failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data: null, error: null };
}
```

- [ ] **Step 2: Manually verify the primary-image swap logic**

With local Supabase running:

```bash
DRESS_ID=$(psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -t -A -c "
INSERT INTO stock_dresses (name, garment_type, category, base_price)
VALUES ('Task 2 test dress', 'Kurti', 'formals', 5000) RETURNING id;")

psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
INSERT INTO stock_dress_images (dress_id, image_url, is_primary)
VALUES ('$DRESS_ID', 'https://example.com/a.jpg', true);
INSERT INTO stock_dress_images (dress_id, image_url, is_primary)
VALUES ('$DRESS_ID', 'https://example.com/b.jpg', false);
SELECT id, image_url, is_primary FROM stock_dress_images WHERE dress_id='$DRESS_ID';"
```

Note the second image's `id`, then confirm the unique-partial-index constraint the code relies on:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
UPDATE stock_dress_images SET is_primary = true WHERE dress_id='$DRESS_ID' AND is_primary = true;
UPDATE stock_dress_images SET is_primary = false WHERE dress_id='$DRESS_ID' AND is_primary = true;
UPDATE stock_dress_images SET is_primary = true WHERE image_url = 'https://example.com/b.jpg';
SELECT image_url, is_primary FROM stock_dress_images WHERE dress_id='$DRESS_ID';"
```

Expected: `a.jpg` now `is_primary=false`, `b.jpg` now `is_primary=true` — proves the clear-then-set two-step approach `setPrimaryImage` uses is safe against the unique index. Clean up:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "TRUNCATE stock_dresses CASCADE;"
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/stockDressImagesService.js
git commit -m "feat: add stockDressImagesService"
```

---

### Task 3: Create options and variants service files

**Files:**
- Create: `src/lib/services/stockDressOptionsService.js`
- Create: `src/lib/services/stockDressVariantsService.js`
- Create: `src/lib/services/stockDressVariantValuesService.js`

- [ ] **Step 1: Write `stockDressOptionsService.js`**

```js
// Service layer for `stock_dress_options` and `stock_dress_option_values`
// (F17). Options are client-facing customization choices at order time
// (e.g. "Dupatta Style" -> "Plain"/"Painted") — not stocked, not SKU'd.

import { supabase } from "$lib/supabaseClient";

/**
 * Fetch all options for a dress, each with its values, ordered by position.
 * @param {string} dressId
 * @returns {Promise<{ data: any[] | null, error: string | null }>}
 */
export async function listOptionsForDress(dressId) {
	const { data, error } = await supabase
		.from("stock_dress_options")
		.select("*, stock_dress_option_values (*)")
		.eq("dress_id", dressId)
		.order("position", { ascending: true });

	if (error) {
		console.error("listOptionsForDress failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * @param {{ dress_id: string, name: string, position?: number }} option
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function createOption(option) {
	const { data, error } = await supabase
		.from("stock_dress_options")
		.insert(option)
		.select()
		.single();

	if (error) {
		console.error("createOption failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * @param {{ option_id: string, value: string, price_adjustment?: number, position?: number }} optionValue
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function addOptionValue(optionValue) {
	const { data, error } = await supabase
		.from("stock_dress_option_values")
		.insert(optionValue)
		.select()
		.single();

	if (error) {
		console.error("addOptionValue failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * @param {string} optionId
 * @returns {Promise<{ data: null, error: string | null }>}
 */
export async function deleteOption(optionId) {
	const { error } = await supabase.from("stock_dress_options").delete().eq("id", optionId);

	if (error) {
		console.error("deleteOption failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data: null, error: null };
}

/**
 * @param {string} optionValueId
 * @returns {Promise<{ data: null, error: string | null }>}
 */
export async function deleteOptionValue(optionValueId) {
	const { error } = await supabase
		.from("stock_dress_option_values")
		.delete()
		.eq("id", optionValueId);

	if (error) {
		console.error("deleteOptionValue failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data: null, error: null };
}
```

- [ ] **Step 2: Write `stockDressVariantsService.js`**

```js
// Service layer for `stock_dress_variants` (F17). A variant's `sku` is
// database-generated (see refresh_stock_variant_sku() in the migration) —
// never set it directly here. It starts null and is filled in once axis
// values are attached via stockDressVariantValuesService.

import { supabase } from "$lib/supabaseClient";

/**
 * Fetch all variants for a dress, each with its axis values.
 * @param {string} dressId
 * @returns {Promise<{ data: any[] | null, error: string | null }>}
 */
export async function listVariantsForDress(dressId) {
	const { data, error } = await supabase
		.from("stock_dress_variants")
		.select("*, stock_dress_variant_values (*)")
		.eq("dress_id", dressId)
		.order("created_at", { ascending: true });

	if (error) {
		console.error("listVariantsForDress failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * Create a bare variant shell (no axis values yet). SKU stays null until
 * stockDressVariantValuesService.setVariantAxisValue is called at least once.
 * @param {{ dress_id: string, price_override?: number, quantity?: number }} variant
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function createVariant(variant) {
	const { data, error } = await supabase
		.from("stock_dress_variants")
		.insert(variant)
		.select()
		.single();

	if (error) {
		console.error("createVariant failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * @param {string} id
 * @param {{ price_override?: number | null, quantity?: number | null, status?: string }} updates
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function updateVariant(id, updates) {
	const { data, error } = await supabase
		.from("stock_dress_variants")
		.update(updates)
		.eq("id", id)
		.select()
		.single();

	if (error) {
		console.error("updateVariant failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * Soft-delete: sets status to 'archived'. Never hard-deletes.
 * @param {string} id
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function archiveVariant(id) {
	return updateVariant(id, { status: "archived" });
}
```

- [ ] **Step 3: Write `stockDressVariantValuesService.js`**

```js
// Service layer for `stock_dress_variant_values` (F17). Inserting/updating/
// deleting a row here is what triggers refresh_stock_variant_sku() in the
// database — the parent variant's SKU is recomputed automatically as a side
// effect. Callers never construct SKU strings themselves.

import { supabase } from "$lib/supabaseClient";

/**
 * Set (create or replace) one axis value on a variant, e.g. axis='size',
 * value='M'. Because stock_dress_variant_values has a UNIQUE(variant_id, axis)
 * constraint, this upserts on that pair.
 * @param {{ variant_id: string, axis: 'size' | 'color' | 'fabric' | 'other', value: string }} axisValue
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function setVariantAxisValue(axisValue) {
	const { data, error } = await supabase
		.from("stock_dress_variant_values")
		.upsert(axisValue, { onConflict: "variant_id,axis" })
		.select()
		.single();

	if (error) {
		console.error("setVariantAxisValue failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * @param {string} variantId
 * @param {'size' | 'color' | 'fabric' | 'other'} axis
 * @returns {Promise<{ data: null, error: string | null }>}
 */
export async function removeVariantAxisValue(variantId, axis) {
	const { error } = await supabase
		.from("stock_dress_variant_values")
		.delete()
		.eq("variant_id", variantId)
		.eq("axis", axis);

	if (error) {
		console.error("removeVariantAxisValue failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data: null, error: null };
}
```

- [ ] **Step 4: Manually verify SKU regeneration flows through the service layer**

```bash
DRESS_ID=$(psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -t -A -c "
INSERT INTO stock_dresses (name, garment_type, category, base_price)
VALUES ('Task 3 test dress', 'Kurti', 'formals', 5000) RETURNING id;")
echo "Dress: $DRESS_ID"
```

In the dev server's browser console (with the app open, so `supabase` is in scope via a temporary `window.supabase = supabase` added to `+page.svelte` — remove after testing, or just test this in Task 8 where the real form exercises it), or via curl against the local REST API:

```bash
VARIANT_ID=$(curl -s -X POST "http://127.0.0.1:54321/rest/v1/stock_dress_variants" \
  -H "apikey: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH" \
  -H "Authorization: Bearer sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"dress_id\":\"$DRESS_ID\",\"quantity\":2}" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Variant: $VARIANT_ID"

curl -s -X POST "http://127.0.0.1:54321/rest/v1/stock_dress_variant_values" \
  -H "apikey: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH" \
  -H "Authorization: Bearer sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"variant_id\":\"$VARIANT_ID\",\"axis\":\"size\",\"value\":\"M\"}"

psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT sku FROM stock_dress_variants WHERE id='$VARIANT_ID';"
```

Expected: `sku` is now `GSP-0000X-M` (matching the dress's own SKU number). Clean up:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "TRUNCATE stock_dresses CASCADE;"
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/stockDressOptionsService.js src/lib/services/stockDressVariantsService.js src/lib/services/stockDressVariantValuesService.js
git commit -m "feat: add options/variants/variant-values services"
```

---

### Task 4: Add `createStockDressWithDetails` orchestration function

**Files:**
- Modify: `src/lib/services/stockDressesService.js`

- [ ] **Step 1: Add the orchestration function**

This is the single entry point `StockDressForm.svelte` calls on submit — it performs the dress → images → options → option values → variants → variant axis values inserts in dependency order, and stops (returning the first error) if any step fails partway. Append to `src/lib/services/stockDressesService.js`:

```js
import { addImage } from "$lib/services/stockDressImagesService";
import { createOption, addOptionValue } from "$lib/services/stockDressOptionsService";
import { createVariant } from "$lib/services/stockDressVariantsService";
import { setVariantAxisValue } from "$lib/services/stockDressVariantValuesService";

/**
 * Create a stock dress along with its images, options, and variants in one
 * call. Inserts run in dependency order (dress -> images -> options ->
 * option values -> variant shells -> variant axis values). If any step
 * fails, the function stops and returns that error immediately — the dress
 * row (and whatever was inserted before the failure) is NOT rolled back,
 * since Supabase's REST API has no cross-table transaction support here.
 * Partial data is left in place; the caller can inspect `data.dress.id` to
 * clean up manually if needed.
 *
 * @param {{
 *   dress: { name: string, garment_type: string, category: string, subcategory?: string, base_price: number, production_cost?: number, notes?: string },
 *   images?: { image_url: string, is_primary?: boolean, caption?: string }[],
 *   options?: { name: string, values: { value: string, price_adjustment?: number }[] }[],
 *   variants?: { price_override?: number, quantity?: number, axisValues: { axis: 'size' | 'color' | 'fabric' | 'other', value: string }[] }[]
 * }} formData
 * @returns {Promise<{ data: { dress: any } | null, error: string | null }>}
 */
export async function createStockDressWithDetails(formData) {
	const { data: dress, error: dressError } = await createStockDress(formData.dress);
	if (dressError) {
		return { data: null, error: dressError };
	}

	for (const image of formData.images ?? []) {
		const { error } = await addImage({ ...image, dress_id: dress.id });
		if (error) {
			return { data: { dress }, error: `Dress created (${dress.sku}), but image failed: ${error}` };
		}
	}

	for (const option of formData.options ?? []) {
		const { data: createdOption, error: optionError } = await createOption({
			dress_id: dress.id,
			name: option.name,
		});
		if (optionError) {
			return {
				data: { dress },
				error: `Dress created (${dress.sku}), but option "${option.name}" failed: ${optionError}`,
			};
		}
		for (const value of option.values) {
			const { error } = await addOptionValue({ ...value, option_id: createdOption.id });
			if (error) {
				return {
					data: { dress },
					error: `Dress created (${dress.sku}), but option value "${value.value}" failed: ${error}`,
				};
			}
		}
	}

	for (const variant of formData.variants ?? []) {
		const { data: createdVariant, error: variantError } = await createVariant({
			dress_id: dress.id,
			price_override: variant.price_override,
			quantity: variant.quantity,
		});
		if (variantError) {
			return { data: { dress }, error: `Dress created (${dress.sku}), but a variant failed: ${variantError}` };
		}
		for (const axisValue of variant.axisValues) {
			const { error } = await setVariantAxisValue({ ...axisValue, variant_id: createdVariant.id });
			if (error) {
				return {
					data: { dress },
					error: `Dress created (${dress.sku}), but variant axis value failed: ${error}`,
				};
			}
		}
	}

	return { data: { dress }, error: null };
}
```

- [ ] **Step 2: Manually verify end-to-end via the browser console**

With the dev server running against local Supabase, open the browser console on any page and run:

```js
const { createStockDressWithDetails } = await import("/src/lib/services/stockDressesService.js");
const result = await createStockDressWithDetails({
  dress: { name: "Console test dress", garment_type: "Sharara Set", category: "party_wear", base_price: 15000 },
  images: [{ image_url: "https://example.com/a.jpg", is_primary: true }],
  options: [{ name: "Dupatta Style", values: [{ value: "Plain" }, { value: "Painted", price_adjustment: 1500 }] }],
  variants: [{ quantity: 2, axisValues: [{ axis: "size", value: "M" }] }],
});
console.log(result);
```

Expected: `result.error === null`, `result.data.dress.sku` matches `GSP-XXXXX`. Then verify in psql:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
SELECT d.sku AS dress_sku, v.sku AS variant_sku, v.quantity, o.name AS option_name, ov.value
FROM stock_dresses d
LEFT JOIN stock_dress_variants v ON v.dress_id = d.id
LEFT JOIN stock_dress_options o ON o.dress_id = d.id
LEFT JOIN stock_dress_option_values ov ON ov.option_id = o.id
WHERE d.name = 'Console test dress';"
```

Expected: one row per option-value combination, `variant_sku` ending in `-M`. Clean up:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "TRUNCATE stock_dresses CASCADE;"
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/stockDressesService.js
git commit -m "feat: add createStockDressWithDetails orchestration"
```

---

### Task 5: `StockDressCard.svelte` and `StockDressGrid.svelte`

**Files:**
- Create: `src/routes/stock/components/StockDressCard.svelte`
- Create: `src/routes/stock/components/StockDressGrid.svelte`

- [ ] **Step 1: Write `StockDressCard.svelte`**

```svelte
<script>
	/** @type {{ dress: any, onSelect: (dress: any) => void }} */
	let { dress, onSelect } = $props();

	const primaryImage = $derived(
		dress.stock_dress_images?.find((img) => img.is_primary) ?? dress.stock_dress_images?.[0],
	);

	// "Starting from" price: lowest price_override among non-archived
	// variants, falling back to base_price if none set an override.
	const displayPrice = $derived.by(() => {
		const activeVariants = (dress.stock_dress_variants ?? []).filter((v) => v.status !== "archived");
		const overrides = activeVariants
			.map((v) => v.price_override)
			.filter((p) => p !== null && p !== undefined);
		if (overrides.length === 0) return dress.base_price;
		return Math.min(...overrides);
	});

	const categoryLabel = $derived(
		dress.subcategory
			? `${formatLabel(dress.category)} · ${formatLabel(dress.subcategory)}`
			: formatLabel(dress.category),
	);

	function formatLabel(value) {
		return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
	}
</script>

<button class="stock-card" onclick={() => onSelect(dress)}>
	<div class="card-image">
		{#if primaryImage}
			<img src={primaryImage.image_url} alt={dress.name} />
		{:else}
			<div class="card-image-placeholder">👗</div>
		{/if}
	</div>
	<div class="card-body">
		<div class="card-name">{dress.name}</div>
		<div class="card-meta">{categoryLabel}</div>
		<div class="card-footer">
			<span class="card-price">PKR {Number(displayPrice).toLocaleString()}</span>
			<span class="status-badge status-{dress.status}">{formatLabel(dress.status)}</span>
		</div>
	</div>
</button>

<style>
	.stock-card {
		display: flex;
		flex-direction: column;
		background: var(--white);
		border: 1px solid var(--border);
		border-radius: 12px;
		overflow: hidden;
		box-shadow: var(--shadow);
		cursor: pointer;
		text-align: left;
		padding: 0;
		font-family: 'DM Sans', sans-serif;
		transition: transform 0.1s, box-shadow 0.1s;
	}

	.stock-card:hover {
		box-shadow: var(--shadow-lg);
	}

	.card-image {
		height: 140px;
		background: var(--bg2);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.card-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.card-image-placeholder {
		font-size: 32px;
		opacity: 0.5;
	}

	.card-body {
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.card-name {
		font-weight: 500;
		font-size: 13px;
		color: var(--text);
	}

	.card-meta {
		font-size: 11px;
		color: var(--text-muted);
	}

	.card-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 6px;
	}

	.card-price {
		font-size: 13px;
		font-weight: 500;
		color: #8b6914;
	}

	.status-badge {
		font-size: 10px;
		font-weight: 500;
		padding: 2px 8px;
		border-radius: 10px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.status-available {
		background: var(--green-dim);
		color: var(--green);
		border: 1px solid rgba(58, 107, 74, 0.18);
	}

	.status-reserved {
		background: var(--gold-dim);
		color: #8b6914;
		border: 1px solid var(--gold-mid);
	}

	.status-sold {
		background: var(--error-dim);
		color: var(--error);
		border: 1px solid rgba(139, 58, 58, 0.18);
	}

	.status-archived {
		background: #f0efed;
		color: #6b6560;
		border: 1px solid #ddd9d3;
	}

	/* Mobile: horizontal layout, image left, details right */
	@media (max-width: 767px) {
		.stock-card {
			flex-direction: row;
		}

		.card-image {
			width: 100px;
			height: auto;
		}

		.card-body {
			flex: 1;
			justify-content: center;
		}
	}
</style>
```

- [ ] **Step 2: Write `StockDressGrid.svelte`**

```svelte
<script>
	/** @type {{ dresses: any[], onSelect: (dress: any) => void }} */
	let { dresses, onSelect } = $props();

	import StockDressCard from "./StockDressCard.svelte";
</script>

{#if dresses.length === 0}
	<p class="empty-state">No stock dresses match your filters.</p>
{:else}
	<div class="stock-grid">
		{#each dresses as dress (dress.id)}
			<StockDressCard {dress} {onSelect} />
		{/each}
	</div>
{/if}

<style>
	.stock-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 14px;
	}

	.empty-state {
		color: var(--text-muted);
		font-size: 13px;
		padding: 40px 0;
		text-align: center;
	}

	@media (max-width: 1023px) {
		.stock-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 767px) {
		.stock-grid {
			grid-template-columns: 1fr;
			gap: 12px;
		}
	}
</style>
```

- [ ] **Step 3: Manually verify — build a temporary test route**

These two components need data to render. Verification happens together with Task 8 (the real `/stock` route) — skip a standalone check here to avoid throwaway scaffolding; proceed to commit, then verify visually once Task 8 wires everything together.

- [ ] **Step 4: Commit**

```bash
git add src/routes/stock/components/StockDressCard.svelte src/routes/stock/components/StockDressGrid.svelte
git commit -m "feat: add StockDressCard and StockDressGrid components"
```

---

### Task 6: `StockDressFilters.svelte`

**Files:**
- Create: `src/routes/stock/components/StockDressFilters.svelte`

- [ ] **Step 1: Write the component**

```svelte
<script>
	/**
	 * @type {{
	 *   search: string,
	 *   category: string,
	 *   subcategory: string,
	 *   sizeType: string,
	 *   status: string,
	 *   onChange: (filters: { search: string, category: string, subcategory: string, sizeType: string, status: string }) => void
	 * }}
	 */
	let { search, category, subcategory, sizeType, status, onChange } = $props();

	const CATEGORIES = [
		{ value: "", label: "All Categories" },
		{ value: "party_wear", label: "Party Wear" },
		{ value: "formals", label: "Formals" },
		{ value: "bridal", label: "Bridal" },
		{ value: "nikkah_wear", label: "Nikkah Wear" },
	];

	const SUBCATEGORIES = [
		{ value: "", label: "All" },
		{ value: "mehendi", label: "Mehendi" },
		{ value: "barat", label: "Barat" },
		{ value: "walima", label: "Walima" },
	];

	const SIZE_TYPES = [
		{ value: "", label: "All Sizes" },
		{ value: "standard", label: "Standard" },
		{ value: "custom", label: "Custom" },
	];

	const STATUSES = [
		{ value: "", label: "All Statuses" },
		{ value: "available", label: "Available" },
		{ value: "reserved", label: "Reserved" },
		{ value: "sold", label: "Sold" },
		{ value: "archived", label: "Archived" },
	];

	function emit(patch) {
		onChange({ search, category, subcategory, sizeType, status, ...patch });
	}
</script>

<div class="controls-row">
	<div class="search-wrap">
		<span class="search-icon">🔍</span>
		<input
			class="search-input"
			type="text"
			placeholder="Search by name or garment type…"
			value={search}
			oninput={(e) => emit({ search: e.currentTarget.value })}
		/>
	</div>

	<select
		class="filter-select"
		value={category}
		onchange={(e) => emit({ category: e.currentTarget.value, subcategory: "" })}
	>
		{#each CATEGORIES as opt}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>

	{#if category === "bridal"}
		<select class="filter-select" value={subcategory} onchange={(e) => emit({ subcategory: e.currentTarget.value })}>
			{#each SUBCATEGORIES as opt}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		</select>
	{/if}

	<select class="filter-select" value={sizeType} onchange={(e) => emit({ sizeType: e.currentTarget.value })}>
		{#each SIZE_TYPES as opt}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>

	<select class="filter-select" value={status} onchange={(e) => emit({ status: e.currentTarget.value })}>
		{#each STATUSES as opt}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
</div>

<style>
	.controls-row {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 16px;
		flex-wrap: wrap;
	}

	.search-wrap {
		flex: 1;
		max-width: 300px;
		position: relative;
	}

	.search-input {
		width: 100%;
		padding: 8px 12px 8px 34px;
		background: var(--white);
		border: 1px solid var(--border);
		border-radius: 9px;
		font-size: 13px;
		font-family: 'DM Sans', sans-serif;
		color: var(--text);
		outline: none;
		transition: border-color 0.15s;
	}

	.search-input:focus {
		border-color: var(--gold);
	}

	.search-icon {
		position: absolute;
		left: 11px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 13px;
		color: var(--text-faint);
		pointer-events: none;
	}

	.filter-select {
		appearance: none;
		background: var(--white);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 8px 28px 8px 11px;
		font-size: 12px;
		color: var(--text);
		font-family: 'DM Sans', sans-serif;
		cursor: pointer;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23B0AAA2' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 9px center;
		outline: none;
	}

	.filter-select:focus {
		border-color: var(--gold);
	}

	@media (max-width: 767px) {
		.controls-row {
			flex-direction: column;
			align-items: stretch;
		}

		.search-wrap {
			max-width: none;
		}
	}
</style>
```

Note: CSS classes (`.controls-row`, `.search-input`, `.filter-select`) are lifted directly from `screens/inventory.html`'s existing design system for visual consistency with the rest of the app.

- [ ] **Step 2: Commit**

```bash
git add src/routes/stock/components/StockDressFilters.svelte
git commit -m "feat: add StockDressFilters component"
```

---

### Task 7: `VariantList.svelte`

**Files:**
- Create: `src/routes/stock/components/VariantList.svelte`

- [ ] **Step 1: Write the component**

This component has two modes: `editable` (used inside the form, lets you add/remove variants and set axis values before the dress is even saved — so variants here are plain local objects, not yet persisted) and read-only (used inside the drawer, showing real persisted variants with their generated SKUs).

```svelte
<script>
	/**
	 * @type {{
	 *   variants: any[],
	 *   editable?: boolean,
	 *   onChange?: (variants: any[]) => void
	 * }}
	 */
	let { variants, editable = false, onChange } = $props();

	function addVariant() {
		if (!editable) return;
		onChange([...variants, { size: "", quantity: null, price_override: null, status: "available" }]);
	}

	function removeVariant(index) {
		if (!editable) return;
		onChange(variants.filter((_, i) => i !== index));
	}

	function updateVariant(index, patch) {
		if (!editable) return;
		onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
	}

	function axisValue(variant, axis) {
		if (editable) return variant.size ?? "";
		return variant.stock_dress_variant_values?.find((v) => v.axis === axis)?.value ?? "";
	}
</script>

<div class="variant-section">
	{#if variants.length === 0}
		<p class="variant-empty">No variants yet.</p>
	{:else}
		<!-- Desktop/tablet: table -->
		<div class="variant-table">
			<div class="variant-table-header">
				<div>SKU</div>
				<div>Size</div>
				<div>Qty</div>
				<div>Price Override</div>
				<div>Status</div>
				{#if editable}<div></div>{/if}
			</div>
			{#each variants as variant, i}
				<div class="variant-table-row">
					<div class="variant-sku">{editable ? "(assigned on save)" : (variant.sku ?? "—")}</div>
					<div>
						{#if editable}
							<input
								class="variant-input"
								type="text"
								placeholder="e.g. M"
								value={variant.size}
								oninput={(e) => updateVariant(i, { size: e.currentTarget.value })}
							/>
						{:else}
							{axisValue(variant, "size") || "Custom"}
						{/if}
					</div>
					<div>
						{#if editable}
							<input
								class="variant-input"
								type="number"
								min="0"
								value={variant.quantity ?? ""}
								oninput={(e) => updateVariant(i, { quantity: e.currentTarget.value ? Number(e.currentTarget.value) : null })}
							/>
						{:else}
							{variant.quantity ?? "—"}
						{/if}
					</div>
					<div>
						{#if editable}
							<input
								class="variant-input"
								type="number"
								min="0"
								step="0.01"
								placeholder="—"
								value={variant.price_override ?? ""}
								oninput={(e) => updateVariant(i, { price_override: e.currentTarget.value ? Number(e.currentTarget.value) : null })}
							/>
						{:else}
							{variant.price_override ? `PKR ${Number(variant.price_override).toLocaleString()}` : "—"}
						{/if}
					</div>
					<div>
						<span class="status-badge status-{variant.status}">{variant.status}</span>
					</div>
					{#if editable}
						<button class="variant-remove" onclick={() => removeVariant(i)} aria-label="Remove variant">✕</button>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Mobile: stacked cards -->
		<div class="variant-cards">
			{#each variants as variant, i}
				<div class="variant-card">
					<div class="variant-card-header">
						<span class="variant-sku">{editable ? "(assigned on save)" : (variant.sku ?? "—")}</span>
						{#if editable}
							<button class="variant-remove" onclick={() => removeVariant(i)} aria-label="Remove variant">✕</button>
						{/if}
					</div>
					<div class="variant-card-row">
						<span class="variant-card-label">Size</span>
						{#if editable}
							<input
								class="variant-input"
								type="text"
								placeholder="e.g. M"
								value={variant.size}
								oninput={(e) => updateVariant(i, { size: e.currentTarget.value })}
							/>
						{:else}
							<span>{axisValue(variant, "size") || "Custom"}</span>
						{/if}
					</div>
					<div class="variant-card-row">
						<span class="variant-card-label">Qty</span>
						{#if editable}
							<input
								class="variant-input"
								type="number"
								min="0"
								value={variant.quantity ?? ""}
								oninput={(e) => updateVariant(i, { quantity: e.currentTarget.value ? Number(e.currentTarget.value) : null })}
							/>
						{:else}
							<span>{variant.quantity ?? "—"}</span>
						{/if}
					</div>
					<div class="variant-card-row">
						<span class="variant-card-label">Status</span>
						<span class="status-badge status-{variant.status}">{variant.status}</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if editable}
		<button class="add-variant-btn" onclick={addVariant}>+ Add Variant</button>
	{/if}
</div>

<style>
	.variant-empty {
		color: var(--text-muted);
		font-size: 12px;
		padding: 12px 0;
	}

	.variant-table {
		border: 1px solid var(--border);
		border-radius: 10px;
		overflow: hidden;
	}

	.variant-table-header,
	.variant-table-row {
		display: grid;
		grid-template-columns: 1fr 1fr 90px 130px 110px 32px;
		align-items: center;
		padding: 10px 12px;
		gap: 8px;
	}

	.variant-table-header {
		background: #f5f3f0;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-faint);
	}

	.variant-table-row {
		border-top: 1px solid var(--border-light);
		font-size: 12px;
	}

	.variant-sku {
		font-family: 'JetBrains Mono', monospace;
		color: var(--text-muted);
		font-size: 11px;
	}

	.variant-input {
		width: 100%;
		padding: 5px 8px;
		border: 1px solid var(--border);
		border-radius: 6px;
		font-size: 12px;
		font-family: 'DM Sans', sans-serif;
	}

	.variant-remove {
		background: none;
		border: none;
		color: var(--text-faint);
		cursor: pointer;
		font-size: 13px;
	}

	.status-badge {
		font-size: 10px;
		font-weight: 500;
		padding: 2px 8px;
		border-radius: 10px;
		text-transform: uppercase;
	}

	.status-available {
		background: var(--green-dim);
		color: var(--green);
	}

	.status-reserved {
		background: var(--gold-dim);
		color: #8b6914;
	}

	.status-sold {
		background: var(--error-dim);
		color: var(--error);
	}

	.status-archived {
		background: #f0efed;
		color: #6b6560;
	}

	.add-variant-btn {
		margin-top: 10px;
		background: none;
		border: 1px dashed var(--border);
		border-radius: 8px;
		padding: 8px 14px;
		font-size: 12px;
		color: var(--text-muted);
		cursor: pointer;
		width: 100%;
	}

	.variant-cards {
		display: none;
	}

	@media (max-width: 767px) {
		.variant-table {
			display: none;
		}

		.variant-cards {
			display: flex;
			flex-direction: column;
			gap: 10px;
		}

		.variant-card {
			border: 1px solid var(--border);
			border-radius: 10px;
			padding: 12px;
		}

		.variant-card-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 8px;
		}

		.variant-card-row {
			display: flex;
			justify-content: space-between;
			align-items: center;
			font-size: 12px;
			margin-bottom: 6px;
		}

		.variant-card-label {
			color: var(--text-muted);
		}

		.variant-card-row .variant-input {
			width: 60%;
		}
	}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/stock/components/VariantList.svelte
git commit -m "feat: add VariantList component"
```

---

### Task 8: `+page.svelte` — the `/stock` route (list + filters wired together)

**Files:**
- Create: `src/routes/stock/+page.svelte`

- [ ] **Step 1: Write the route**

```svelte
<script>
	import { listStockDresses } from "$lib/services/stockDressesService";
	import StockDressGrid from "./components/StockDressGrid.svelte";
	import StockDressFilters from "./components/StockDressFilters.svelte";
	import StockDressDrawer from "./components/StockDressDrawer.svelte";

	let allDresses = $state([]);
	let loading = $state(true);
	let error = $state(null);

	let filters = $state({ search: "", category: "", subcategory: "", sizeType: "", status: "" });

	let selectedDress = $state(null);
	let drawerOpen = $state(false);
	let formOpen = $state(false);

	async function load() {
		loading = true;
		error = null;
		const { data, error: fetchError } = await listStockDresses();
		if (fetchError) {
			error = fetchError;
		} else {
			allDresses = data ?? [];
		}
		loading = false;
	}

	$effect(() => {
		load();
	});

	const filteredDresses = $derived.by(() => {
		return allDresses.filter((dress) => {
			if (filters.search) {
				const q = filters.search.toLowerCase();
				const matches =
					dress.name.toLowerCase().includes(q) || dress.garment_type.toLowerCase().includes(q);
				if (!matches) return false;
			}
			if (filters.category && dress.category !== filters.category) return false;
			if (filters.subcategory && dress.subcategory !== filters.subcategory) return false;
			if (filters.status && dress.status !== filters.status) return false;
			if (filters.sizeType) {
				const variants = dress.stock_dress_variants ?? [];
				const hasSizeType = variants.some((v) => {
					const hasSize = v.stock_dress_variant_values?.some((av) => av.axis === "size");
					return filters.sizeType === "standard" ? hasSize : !hasSize;
				});
				if (variants.length > 0 && !hasSizeType) return false;
			}
			return true;
		});
	});

	function openDrawer(dress) {
		selectedDress = dress;
		drawerOpen = true;
	}

	function closeDrawer() {
		drawerOpen = false;
	}

	function openAddForm() {
		selectedDress = null;
		formOpen = true;
	}

	async function handleDrawerClosed() {
		drawerOpen = false;
		await load();
	}
</script>

<div class="topbar">
	<div class="breadcrumb"><span>Stock Dresses</span></div>
</div>

<div class="content-area">
	<div class="scroll-area">
		<div class="page-header">
			<div>
				<div class="page-title">Stock Dresses</div>
				<div class="page-meta">Finished ready-made dresses available for sale</div>
			</div>
			<button class="btn-gold" onclick={openAddForm}>+ Add Stock Dress</button>
		</div>

		<StockDressFilters
			search={filters.search}
			category={filters.category}
			subcategory={filters.subcategory}
			sizeType={filters.sizeType}
			status={filters.status}
			onChange={(newFilters) => (filters = newFilters)}
		/>

		{#if loading}
			<p>Loading…</p>
		{:else if error}
			<p class="error-text">Error: {error}</p>
		{:else}
			<StockDressGrid dresses={filteredDresses} onSelect={openDrawer} />
		{/if}
	</div>
</div>

{#if drawerOpen || formOpen}
	<StockDressDrawer
		dress={selectedDress}
		startInEditMode={formOpen}
		onClose={() => {
			drawerOpen = false;
			formOpen = false;
		}}
		onSaved={handleDrawerClosed}
	/>
{/if}

<style>
	.topbar {
		background: var(--bg);
		border-bottom: 1px solid var(--border);
		padding: 0 28px;
		height: 56px;
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.breadcrumb {
		font-size: 12px;
		color: var(--text-muted);
	}

	.breadcrumb span {
		color: var(--text);
		font-weight: 500;
	}

	.content-area {
		flex: 1;
		overflow: hidden;
	}

	.scroll-area {
		height: 100%;
		overflow-y: auto;
		padding: 24px 28px;
	}

	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 22px;
	}

	.page-title {
		font-family: 'Playfair Display', serif;
		font-size: 34px;
		font-weight: 500;
		letter-spacing: -0.01em;
		line-height: 1;
	}

	.page-meta {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 6px;
	}

	.btn-gold {
		display: flex;
		align-items: center;
		gap: 6px;
		background: var(--gold);
		border: none;
		border-radius: 8px;
		padding: 7px 14px;
		font-size: 12px;
		font-weight: 500;
		color: #fff;
		cursor: pointer;
		font-family: 'DM Sans', sans-serif;
		box-shadow: 0 2px 8px rgba(201, 169, 97, 0.3);
		transition: all 0.15s;
	}

	.btn-gold:hover {
		background: #b8953a;
	}

	.error-text {
		color: var(--error);
		font-size: 13px;
	}

	@media (max-width: 767px) {
		.scroll-area {
			padding: 16px;
			padding-bottom: 72px; /* clear the mobile tab bar */
		}
	}
</style>
```

Note: this references `StockDressDrawer.svelte`, written in Task 9 — the route won't compile until that task is done. That's expected; proceed to Task 9 before attempting to verify Task 8.

- [ ] **Step 2: Commit**

```bash
git add src/routes/stock/+page.svelte
git commit -m "feat: add /stock route with filters and grid wired together"
```

---

### Task 9: `StockDressForm.svelte` and `StockDressDrawer.svelte`

**Files:**
- Create: `src/routes/stock/components/StockDressForm.svelte`
- Create: `src/routes/stock/components/StockDressDrawer.svelte`

- [ ] **Step 1: Write `StockDressForm.svelte`**

```svelte
<script>
	import { createStockDressWithDetails, updateStockDress } from "$lib/services/stockDressesService";
	import VariantList from "./VariantList.svelte";

	/**
	 * @type {{
	 *   dress?: any,
	 *   onSaved: () => void,
	 *   onCancel: () => void
	 * }}
	 */
	let { dress = null, onSaved, onCancel } = $props();

	const isEditing = dress !== null;

	let name = $state(dress?.name ?? "");
	let garmentType = $state(dress?.garment_type ?? "");
	let category = $state(dress?.category ?? "party_wear");
	let subcategory = $state(dress?.subcategory ?? "");
	let basePrice = $state(dress?.base_price ?? "");
	let productionCost = $state(dress?.production_cost ?? "");
	let notes = $state(dress?.notes ?? "");
	let imageUrl = $state("");
	let images = $state([]);
	let variants = $state([]);

	let saving = $state(false);
	let error = $state(null);

	function addImageUrl() {
		if (!imageUrl.trim()) return;
		images = [...images, { image_url: imageUrl.trim(), is_primary: images.length === 0 }];
		imageUrl = "";
	}

	function removeImage(index) {
		images = images.filter((_, i) => i !== index);
	}

	async function handleSubmit(e) {
		e.preventDefault();
		saving = true;
		error = null;

		const dressPayload = {
			name,
			garment_type: garmentType,
			category,
			subcategory: category === "bridal" && subcategory ? subcategory : null,
			base_price: Number(basePrice),
			production_cost: productionCost ? Number(productionCost) : null,
			notes: notes || null,
		};

		if (isEditing) {
			const { error: updateError } = await updateStockDress(dress.id, dressPayload);
			saving = false;
			if (updateError) {
				error = updateError;
				return;
			}
			onSaved();
			return;
		}

		const { error: createError } = await createStockDressWithDetails({
			dress: dressPayload,
			images,
			options: [],
			variants: variants.map((v) => ({
				price_override: v.price_override,
				quantity: v.quantity,
				axisValues: v.size ? [{ axis: "size", value: v.size }] : [],
			})),
		});

		saving = false;
		if (createError) {
			error = createError;
			return;
		}
		onSaved();
	}
</script>

<form class="stock-form" onsubmit={handleSubmit}>
	<div class="form-section">
		<div class="section-title">Basics</div>
		<label class="form-field">
			<span>Name</span>
			<input type="text" bind:value={name} required />
		</label>
		<label class="form-field">
			<span>Garment Type</span>
			<input type="text" bind:value={garmentType} required placeholder="e.g. Farshi Lehenga" />
		</label>
		<label class="form-field">
			<span>Category</span>
			<select bind:value={category}>
				<option value="party_wear">Party Wear</option>
				<option value="formals">Formals</option>
				<option value="bridal">Bridal</option>
				<option value="nikkah_wear">Nikkah Wear</option>
			</select>
		</label>
		{#if category === "bridal"}
			<label class="form-field">
				<span>Subcategory</span>
				<select bind:value={subcategory}>
					<option value="">—</option>
					<option value="mehendi">Mehendi</option>
					<option value="barat">Barat</option>
					<option value="walima">Walima</option>
				</select>
			</label>
		{/if}
		<label class="form-field">
			<span>Selling Price (PKR)</span>
			<input type="number" min="0" step="0.01" bind:value={basePrice} required />
		</label>
		<label class="form-field">
			<span>Production Cost (PKR, internal only)</span>
			<input type="number" min="0" step="0.01" bind:value={productionCost} />
		</label>
		<label class="form-field">
			<span>Notes</span>
			<textarea bind:value={notes} rows="3"></textarea>
		</label>
	</div>

	{#if !isEditing}
		<div class="form-section">
			<div class="section-title">Images</div>
			<p class="section-hint">Paste an image URL (real upload comes in a later pass).</p>
			<div class="image-input-row">
				<input type="url" placeholder="https://…" bind:value={imageUrl} />
				<button type="button" class="btn-secondary" onclick={addImageUrl}>Add</button>
			</div>
			{#each images as img, i}
				<div class="image-row">
					<span class="image-url">{img.image_url}</span>
					{#if img.is_primary}<span class="primary-tag">Primary</span>{/if}
					<button type="button" class="remove-btn" onclick={() => removeImage(i)}>✕</button>
				</div>
			{/each}
		</div>

		<div class="form-section">
			<div class="section-title">Variants</div>
			<VariantList {variants} editable={true} onChange={(v) => (variants = v)} />
		</div>
	{/if}

	{#if error}
		<p class="error-text">Error: {error}</p>
	{/if}

	<div class="form-actions">
		<button type="button" class="btn-secondary" onclick={onCancel}>Cancel</button>
		<button type="submit" class="btn-gold" disabled={saving}>
			{saving ? "Saving…" : isEditing ? "Save Changes" : "Create Stock Dress"}
		</button>
	</div>
</form>

<style>
	.stock-form {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.form-section {
		border: 1px solid var(--border-light);
		border-radius: 10px;
		padding: 16px;
	}

	.section-title {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-faint);
		margin-bottom: 12px;
	}

	.section-hint {
		font-size: 11px;
		color: var(--text-muted);
		margin-bottom: 8px;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 12px;
		font-size: 12px;
		color: var(--text-muted);
	}

	.form-field input,
	.form-field select,
	.form-field textarea {
		padding: 8px 10px;
		border: 1px solid var(--border);
		border-radius: 8px;
		font-size: 13px;
		font-family: 'DM Sans', sans-serif;
		color: var(--text);
	}

	.image-input-row {
		display: flex;
		gap: 8px;
		margin-bottom: 10px;
	}

	.image-input-row input {
		flex: 1;
		padding: 8px 10px;
		border: 1px solid var(--border);
		border-radius: 8px;
		font-size: 12px;
	}

	.image-row {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		padding: 6px 0;
		border-top: 1px solid var(--border-light);
	}

	.image-url {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text-muted);
	}

	.primary-tag {
		background: var(--gold-dim);
		color: #8b6914;
		font-size: 9px;
		padding: 2px 6px;
		border-radius: 8px;
	}

	.remove-btn {
		background: none;
		border: none;
		color: var(--text-faint);
		cursor: pointer;
	}

	.error-text {
		color: var(--error);
		font-size: 12px;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
	}

	.btn-gold {
		background: var(--gold);
		border: none;
		border-radius: 8px;
		padding: 9px 16px;
		font-size: 12px;
		font-weight: 500;
		color: #fff;
		cursor: pointer;
	}

	.btn-gold:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: var(--white);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 9px 16px;
		font-size: 12px;
		color: var(--text);
		cursor: pointer;
	}
</style>
```

- [ ] **Step 2: Write `StockDressDrawer.svelte`**

```svelte
<script>
	import { getStockDressById, archiveStockDress } from "$lib/services/stockDressesService";
	import VariantList from "./VariantList.svelte";
	import StockDressForm from "./StockDressForm.svelte";

	/**
	 * @type {{
	 *   dress: any | null,
	 *   startInEditMode?: boolean,
	 *   onClose: () => void,
	 *   onSaved: () => void
	 * }}
	 */
	let { dress, startInEditMode = false, onClose, onSaved } = $props();

	let fullDress = $state(null);
	let loading = $state(dress !== null);
	let error = $state(null);
	let editing = $state(startInEditMode);

	$effect(() => {
		if (dress) {
			loadFullDress(dress.id);
		}
	});

	async function loadFullDress(id) {
		loading = true;
		const { data, error: fetchError } = await getStockDressById(id);
		loading = false;
		if (fetchError) {
			error = fetchError;
			return;
		}
		fullDress = data;
	}

	async function handleArchive() {
		if (!fullDress) return;
		const { error: archiveError } = await archiveStockDress(fullDress.id);
		if (archiveError) {
			error = archiveError;
			return;
		}
		onSaved();
	}

	function handleFormSaved() {
		editing = false;
		onSaved();
	}
</script>

<div class="drawer-overlay open" onclick={onClose}></div>
<div class="detail-drawer open">
	<div class="drawer-header">
		<div>
			{#if fullDress}
				<div class="drawer-id">{fullDress.sku}</div>
				<div class="drawer-title">{fullDress.name}</div>
			{:else if !dress}
				<div class="drawer-title">Add Stock Dress</div>
			{/if}
		</div>
		<button class="drawer-close" onclick={onClose}>×</button>
	</div>

	<div class="drawer-body">
		{#if !dress}
			<StockDressForm onSaved={handleFormSaved} onCancel={onClose} />
		{:else if loading}
			<p>Loading…</p>
		{:else if error}
			<p class="error-text">Error: {error}</p>
		{:else if editing}
			<StockDressForm dress={fullDress} onSaved={handleFormSaved} onCancel={() => (editing = false)} />
		{:else if fullDress}
			<div class="drawer-images">
				{#each fullDress.stock_dress_images ?? [] as img}
					<img src={img.image_url} alt={fullDress.name} />
				{/each}
				{#if !fullDress.stock_dress_images?.length}
					<div class="drawer-image-placeholder">👗</div>
				{/if}
			</div>

			<div class="drawer-info-grid">
				<div class="info-cell"><span class="info-label">Category</span>{fullDress.category}{fullDress.subcategory ? ` / ${fullDress.subcategory}` : ""}</div>
				<div class="info-cell"><span class="info-label">Status</span>{fullDress.status}</div>
				<div class="info-cell"><span class="info-label">Base Price</span>PKR {Number(fullDress.base_price).toLocaleString()}</div>
				<div class="info-cell"><span class="info-label">Garment Type</span>{fullDress.garment_type}</div>
			</div>

			{#if fullDress.notes}
				<p class="drawer-notes">{fullDress.notes}</p>
			{/if}

			<div class="drawer-section-title">Variants</div>
			<VariantList variants={fullDress.stock_dress_variants ?? []} editable={false} />

			<div class="drawer-actions">
				<button class="btn-secondary" onclick={() => (editing = true)}>Edit</button>
				<button class="btn-danger" onclick={handleArchive}>Archive</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.drawer-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.2);
		z-index: 200;
		backdrop-filter: blur(2px);
	}

	.detail-drawer {
		position: fixed;
		top: 0;
		right: 0;
		width: 500px;
		height: 100vh;
		background: var(--white);
		border-left: 1px solid var(--border);
		box-shadow: var(--shadow-lg);
		z-index: 201;
		display: flex;
		flex-direction: column;
	}

	.drawer-header {
		padding: 20px 24px;
		border-bottom: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-shrink: 0;
	}

	.drawer-id {
		font-family: 'JetBrains Mono', monospace;
		font-size: 13px;
		color: var(--gold);
		font-weight: 500;
	}

	.drawer-title {
		font-family: 'Playfair Display', serif;
		font-size: 18px;
		font-weight: 500;
		margin-top: 2px;
	}

	.drawer-close {
		width: 28px;
		height: 28px;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: transparent;
		cursor: pointer;
		font-size: 16px;
		color: var(--text-muted);
	}

	.drawer-body {
		flex: 1;
		overflow-y: auto;
		padding: 20px 24px;
	}

	.drawer-images {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		margin-bottom: 16px;
	}

	.drawer-images img {
		width: 120px;
		height: 120px;
		object-fit: cover;
		border-radius: 10px;
		flex-shrink: 0;
	}

	.drawer-image-placeholder {
		width: 100%;
		height: 160px;
		background: var(--bg2);
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 40px;
	}

	.drawer-info-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		border: 1px solid var(--border-light);
		border-radius: 10px;
		overflow: hidden;
		margin-bottom: 20px;
	}

	.info-cell {
		padding: 12px;
		border-bottom: 1px solid var(--border-light);
		border-right: 1px solid var(--border-light);
		font-size: 13px;
	}

	.info-label {
		display: block;
		font-size: 10px;
		color: var(--text-faint);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-bottom: 3px;
	}

	.drawer-notes {
		font-size: 12px;
		color: var(--text-muted);
		margin-bottom: 16px;
	}

	.drawer-section-title {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-faint);
		margin-bottom: 10px;
		margin-top: 20px;
	}

	.drawer-actions {
		display: flex;
		gap: 10px;
		margin-top: 20px;
	}

	.btn-secondary {
		background: var(--white);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 9px 16px;
		font-size: 12px;
		cursor: pointer;
	}

	.btn-danger {
		background: var(--error-dim);
		border: 1px solid rgba(139, 58, 58, 0.18);
		color: var(--error);
		border-radius: 8px;
		padding: 9px 16px;
		font-size: 12px;
		cursor: pointer;
	}

	.error-text {
		color: var(--error);
		font-size: 12px;
	}

	/* Mobile: full-screen instead of a 500px side drawer */
	@media (max-width: 767px) {
		.detail-drawer {
			width: 100%;
		}
	}
</style>
```

- [ ] **Step 3: Manually verify the full flow in the browser**

```bash
cd /Users/mac/ubm/projects/pos/frontend
# In one terminal: ensure local Supabase is running
supabase status
# In another terminal:
bun run dev
```

Open the Browser tool at `http://localhost:1420/stock` (desktop viewport first):

1. Click "+ Add Stock Dress" → drawer opens with the form.
2. Fill in Name="Test Farshi Lehenga", Garment Type="Farshi Lehenga", Category="Bridal", Subcategory="Barat", Selling Price=45000. Add an image URL (e.g. `https://picsum.photos/400`). Add one variant with Size="M", Qty=2.
3. Submit. Expected: drawer closes, grid reloads, new card appears showing "Test Farshi Lehenga", "Bridal · Barat", "PKR 45,000".
4. Click the card → drawer opens read-only, showing the SKU (`GSP-XXXXX`), the image, the variant row with SKU `GSP-XXXXX-M`.
5. Click "Edit" → form reopens pre-filled with current values (note: per Task 9's code, editing only re-submits the Basics section — images/variants are not editable after creation in this pass; that's an acceptable scope limit, not a bug — flag it to the user if it becomes a problem).
6. Click "Archive" → drawer closes, dress disappears from default view (since default filter shows nothing archived... actually verify: does it? Check the filters — if `status` filter is empty, archived dresses will still show. This is correct per the design spec's filter behavior, not a bug).
7. Resize the Browser tool to mobile (375px) and repeat steps 1-4 — confirm the drawer becomes full-screen, the variant list becomes stacked cards, and the grid is 1 column.

- [ ] **Step 4: Clean up test data**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "TRUNCATE stock_dresses CASCADE;"
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/stock/components/StockDressForm.svelte src/routes/stock/components/StockDressDrawer.svelte
git commit -m "feat: add StockDressForm and StockDressDrawer components"
```

---

### Task 10: Mobile bottom tab bar

**Files:**
- Create: `src/ui/sidebar/MobileTabBar.svelte`
- Modify: `src/routes/+layout.svelte`
- Modify: `src/ui/sidebar/menu.config.ts`

- [ ] **Step 1: Add the Stock Dresses entry to `menu.config.ts`**

Open `src/ui/sidebar/menu.config.ts` and change the "Stock" section:

```ts
  {
    label: "Stock",
    items: [
      { name: "Stock Dresses", link: "/stock", icon: "👗" },
      { name: "Inventory", link: "/inventory", icon: "📦" },
    ],
  },
```

(This adds the new entry above the existing Inventory link — both now coexist under "Stock".)

- [ ] **Step 2: Write `MobileTabBar.svelte`**

```svelte
<script lang="ts">
	import { page } from "$app/state";

	const TABS = [
		{ name: "Dashboard", link: "/", icon: "📊" },
		{ name: "Orders", link: "/orders", icon: "🛒" },
		{ name: "Stock", link: "/stock", icon: "👗" },
		{ name: "Karigar", link: "/karigar-dashboard", icon: "🙍‍♂️" },
	];

	const MORE_ITEMS = [
		{ name: "Design Library", link: "/design-library", icon: "🧑‍🎨" },
		{ name: "Contacts", link: "/contacts", icon: "📒" },
		{ name: "Agent Ledger", link: "/agent-ledger", icon: "🧾" },
		{ name: "Inventory", link: "/inventory", icon: "📦" },
		{ name: "Settings", link: "/settings", icon: "⚙️" },
	];

	let moreOpen = $state(false);
</script>

<nav class="mobile-tab-bar">
	{#each TABS as tab}
		<a href={tab.link} class="tab-item" class:active={page.url.pathname === tab.link}>
			<span class="tab-icon">{tab.icon}</span>
			<span class="tab-label">{tab.name}</span>
		</a>
	{/each}
	<button class="tab-item" onclick={() => (moreOpen = true)}>
		<span class="tab-icon">⋯</span>
		<span class="tab-label">More</span>
	</button>
</nav>

{#if moreOpen}
	<div class="more-sheet-overlay" onclick={() => (moreOpen = false)}></div>
	<div class="more-sheet">
		<div class="more-sheet-header">
			<span>More</span>
			<button onclick={() => (moreOpen = false)}>×</button>
		</div>
		{#each MORE_ITEMS as item}
			<a href={item.link} class="more-item" onclick={() => (moreOpen = false)}>
				<span class="tab-icon">{item.icon}</span>
				{item.name}
			</a>
		{/each}
	</div>
{/if}

<style>
	.mobile-tab-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 60px;
		background: var(--sidebar-bg);
		display: flex;
		align-items: center;
		justify-content: space-around;
		z-index: 150;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.tab-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		color: var(--sidebar-text);
		text-decoration: none;
		font-size: 9px;
		background: none;
		border: none;
		cursor: pointer;
		font-family: 'DM Sans', sans-serif;
	}

	.tab-item.active {
		color: var(--gold);
	}

	.tab-icon {
		font-size: 18px;
	}

	.more-sheet-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.3);
		z-index: 151;
	}

	.more-sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--sidebar-bg);
		border-radius: 16px 16px 0 0;
		z-index: 152;
		padding: 8px 0 20px;
	}

	.more-sheet-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 20px;
		color: #fff;
		font-size: 13px;
		font-weight: 500;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.more-sheet-header button {
		background: none;
		border: none;
		color: var(--sidebar-text);
		font-size: 18px;
		cursor: pointer;
	}

	.more-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 20px;
		color: var(--sidebar-text);
		text-decoration: none;
		font-size: 13px;
	}
</style>
```

- [ ] **Step 3: Wire `MobileTabBar` into `+layout.svelte`**

Read the current file first, then apply this exact replacement to `src/routes/+layout.svelte`:

```svelte
<script>
    import Sidebar from "../ui/sidebar/Sidebar.svelte";
    import MobileTabBar from "../ui/sidebar/MobileTabBar.svelte";
    import "../app.css";

    let { children } = $props();
</script>

<div class="app-layout">
    <Sidebar />
    <main class="main">
        {@render children()}
    </main>
    <MobileTabBar />
</div>

<style>
    .app-layout {
        display: flex;
        height: 100vh;
        overflow: hidden;
    }

    .main {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 0;
    }

    @media (max-width: 767px) {
        :global(.sidebar) {
            display: none;
        }
    }
</style>
```

`MobileTabBar` itself is `position: fixed`, so it doesn't need to participate in the flex layout — it overlays on top regardless of DOM position. The `:global(.sidebar)` override hides the desktop sidebar below 768px (using `:global` because `.sidebar`'s class is defined inside `Sidebar.svelte`'s own `<style>` block, which is normally scoped away from `+layout.svelte`).

- [ ] **Step 4: Manually verify at all three breakpoints**

With the dev server running, open `http://localhost:1420/` in the Browser tool:

1. **Desktop (1024px+)**: dark sidebar visible, no bottom tab bar.
2. **Tablet (768-1023px)**: same as desktop — sidebar visible, no bottom tab bar (per the design spec, the mobile shell only kicks in below 768px).
3. **Mobile (< 768px)**: sidebar hidden, bottom tab bar visible with Dashboard/Orders/Stock/Karigar/More icons. Click "More" → bottom sheet slides up with the remaining 5 links. Click "Stock" tab → navigates to `/stock`, tab bar stays visible, Stock tab highlighted gold.

- [ ] **Step 5: Commit**

```bash
git add src/ui/sidebar/MobileTabBar.svelte src/routes/+layout.svelte src/ui/sidebar/menu.config.ts
git commit -m "feat: add mobile bottom tab bar navigation shell"
```

---

### Task 11: Retire the test/dev homepage

**Files:**
- Modify: `src/routes/+page.svelte`

The current `/` route is the `staffService`/`stockDressesService` test page built for manually verifying the local-Supabase connection (see earlier session history) — not a real Dashboard. It should stop being what a real user sees at `/`.

- [ ] **Step 1: Replace with a minimal real Dashboard placeholder**

This plan doesn't build the actual Dashboard (out of scope — that's F1/F2 territory per the requirements doc's other feature areas). Replace the test content with a minimal placeholder that at least doesn't look broken or expose dev-only content:

```svelte
<script>
	import { listStockDresses } from "$lib/services/stockDressesService";

	let dressCount = $state(null);

	$effect(() => {
		listStockDresses().then(({ data }) => {
			dressCount = data?.length ?? 0;
		});
	});
</script>

<div class="topbar">
	<div class="breadcrumb"><span>Dashboard</span></div>
</div>

<div class="content-area">
	<div class="scroll-area">
		<div class="page-header">
			<div>
				<div class="page-title">Golden Studio</div>
				<div class="page-meta">Production management dashboard</div>
			</div>
		</div>

		<div class="summary-card">
			<div class="sc-label">Stock Dresses</div>
			<div class="sc-value">{dressCount ?? "—"}</div>
		</div>

		<p class="placeholder-note">
			Full dashboard (order summary, production overview) is a future module.
			<a href="/stock">Go to Stock Dresses →</a>
		</p>
	</div>
</div>

<style>
	.topbar {
		background: var(--bg);
		border-bottom: 1px solid var(--border);
		padding: 0 28px;
		height: 56px;
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.breadcrumb span {
		color: var(--text);
		font-weight: 500;
		font-size: 12px;
	}

	.content-area {
		flex: 1;
		overflow: hidden;
	}

	.scroll-area {
		height: 100%;
		overflow-y: auto;
		padding: 24px 28px;
	}

	.page-title {
		font-family: 'Playfair Display', serif;
		font-size: 34px;
		font-weight: 500;
	}

	.page-meta {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 6px;
	}

	.summary-card {
		background: var(--white);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 16px 18px;
		box-shadow: var(--shadow);
		max-width: 200px;
		margin: 22px 0;
	}

	.sc-label {
		font-size: 10px;
		color: var(--text-faint);
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		margin-bottom: 6px;
	}

	.sc-value {
		font-family: 'JetBrains Mono', monospace;
		font-size: 22px;
		font-weight: 500;
	}

	.placeholder-note {
		font-size: 12px;
		color: var(--text-muted);
	}

	.placeholder-note a {
		color: var(--gold);
	}

	@media (max-width: 767px) {
		.scroll-area {
			padding: 16px;
			padding-bottom: 72px;
		}
	}
</style>
```

- [ ] **Step 2: Also delete the now-unused `staffService.js` test dependency check**

`src/lib/services/staffService.js` itself stays (it'll be needed for the real Auth module later) — only the test page's *usage* of it is being replaced here. No file deletion needed in this step.

- [ ] **Step 3: Manually verify**

```bash
bun run dev
```

Open `http://localhost:1420/` — expect "Golden Studio" header, a "Stock Dresses" count card (0 unless test data exists), a link to `/stock`. No "Insert a test dress" button, no raw error text about missing tables.

- [ ] **Step 4: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "refactor: replace dev test homepage with minimal dashboard placeholder"
```

---

### Task 12: Final full-flow verification and production migration push

**Files:** none (verification + deployment step only)

- [ ] **Step 1: Full local verification pass**

With `supabase start` running and `bun run dev` running, in the Browser tool:

1. Navigate to `/stock`. Create 3 test dresses across different categories (one Party Wear, one Bridal/Barat, one Formals) with at least one variant each.
2. Test each filter (category, subcategory when Bridal selected, status) individually — confirm the grid narrows correctly.
3. Test search — type a partial name, confirm matching narrows correctly.
4. Resize to mobile (375px) — confirm grid is 1 column, cards are horizontal, bottom tab bar is present and Stock tab is highlighted.
5. Resize to tablet (800px) — confirm grid is 2 columns, sidebar still visible (not tab bar).
6. Click a card on mobile — confirm drawer is full-screen, not a 500px side panel.
7. Archive one dress, confirm it's still visible with an "Archived" filter but excluded when no status filter is set... actually per Task 8's filter logic, archived dresses are NOT excluded by default (only excluded if the user explicitly filters status). Confirm this matches the design spec's intent — if the user wants archived hidden by default, that's a follow-up change, not a bug in this plan.

- [ ] **Step 2: Clean up all local test data**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "TRUNCATE stock_dresses CASCADE;"
```

- [ ] **Step 3: Decide on pushing the migration to production**

This plan builds the UI against the **local** Supabase instance only (per the established workflow in this project — see `.env.local` pointing at `127.0.0.1:54321`). The migration in `supabase/migrations/20260812000000_stock_dress_inventory.sql` has NOT been pushed to the production project (`hfxhriowcivwvbndldfj`) as of this plan. Do not push it automatically as part of this task — **stop and ask the user** whether they want it pushed now that the UI is built and verified, since that's a production-database change requiring explicit confirmation (matching the pattern already established earlier in this project's history).

- [ ] **Step 4: Final commit (if any cleanup changes were made)**

```bash
git status
# If anything changed (e.g. a bug found during full-flow verification and fixed):
git add -A
git commit -m "fix: address issues found during full-flow verification"
```

---

## Self-Review Notes

**Spec coverage check** (against `docs/superpowers/specs/2026-08-24-stock-dress-inventory-ui-design.md`):
- Card grid, responsive 4/2/1 columns → Task 5 ✅
- Filters + search → Task 6 ✅
- Add/edit form, single sectioned scroll → Task 9 ✅
- Slide-out drawer desktop, full-screen mobile → Task 9 ✅
- Variant list table/cards → Task 7 ✅
- Mobile bottom tab bar with Dashboard/Orders/Stock/Karigar + More → Task 10 ✅
- Service layer, one file per table, `createStockDressWithDetails` orchestration → Tasks 1-4 ✅
- Image URL stub (no real R2 upload) → Task 9 ✅
- Sidebar "Stock Dresses" entry alongside existing "Inventory" → Task 10 Step 1 ✅

**Known scope limits carried forward from the design spec** (not gaps in this plan — explicitly out of scope): real R2 upload, Auth/login, barcode printing. Also newly noted during planning: editing an existing dress in this pass only updates the Basics section, not images/variants — flagged inline in Task 9 Step 3 rather than silently built and left undiscovered.
