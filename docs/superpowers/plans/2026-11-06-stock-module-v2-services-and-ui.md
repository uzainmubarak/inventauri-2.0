# Stock Module v2 — Service Layer & UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the service layer and existing Stock UI onto schema v2 so the app runs again, with multi-axis variants and the new pricing/availability model.

**Architecture:** Pure logic (pricing, variant combinations, availability state) moves into `src/lib/stock/` as framework-free modules with unit tests. Services stay one-file-per-table returning `{ data, error }`, tested as integration tests against the local Supabase stack. Svelte components are not unit-tested — they are verified by running the app.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, `adapter-static` (SPA, `ssr = false`), Supabase JS v2, Vitest (added by Task 1), bun as package manager.

**Spec:** `docs/stock-module-schema.md`

## Scope

Schema v2 spans four subsystems. This plan covers **only the first**:

| Plan | Covers | Status |
|---|---|---|
| **1 (this)** | Service layer + catalog + create/edit on v2 | — |
| 2 | `stock_borrowers` in Settings + movements UI (record, history, loans) | later |
| 3 | Barcode rendering + label printing | later |

Plan 1 ends with a working app: you can list, filter, create, edit and archive stock with the full v2 field set. Quantity is **read-only in the UI** — the ledger is its only writer, and the surface for posting movements arrives in Plan 2.

## Global Constraints

- Package manager is **bun**. Never `npm` or `npx`.
- Every service function returns `{ data, error }`. Components never call `supabase.from(...)` directly.
- `+page.server.js` cannot be used — static adapter, SSR off.
- Money is `NUMERIC(12,2)`; format as `PKR 70,000` via `Number(v).toLocaleString()`.
- `cost` is internal. Never render it in a view that could be shown to a client.
- `stock_dress_variants.quantity` is written **only** by the `stock_movements` trigger. No service may `UPDATE` it.
- `profit` and `margin` are computed in the UI and never persisted.
- Local dev only. Do not run anything against production Supabase.

## Review Focus

1. **Draft with a blank price** saves `0`, then publishing shows "PKR 0" — publishing must require a price > 0 while saving a draft must not. (Task 5)
2. **`compare_at_price <= price`** is a DB `CHECK`; without a client-side guard the user sees a raw Postgres string. (Task 6)
3. **Variant matrix explosion** — 4 axes with 5 values each is 625 rows; generation must be capped with a visible warning rather than hanging the browser. (Task 2)
4. **Removing a variant that has movements** hits `ON DELETE RESTRICT`; the UI must archive instead of delete and never surface the FK error. (Task 4)
5. **Tags** arriving with duplicates, surrounding whitespace, or empty strings pollute the autocomplete list drawn from `SELECT DISTINCT unnest(tags)`. (Task 6)

---

## File Structure

**Create:**
- `vitest.config.js` — test runner config
- `src/lib/stock/pricing.js` — profit, margin, effective price
- `src/lib/stock/variantMatrix.js` — axis combinations → variant rows
- `src/lib/stock/availability.js` — the quantity/made_to_order/status → display state table
- `src/lib/stock/tags.js` — tag normalisation
- `src/lib/stock/*.test.js` — unit tests alongside each
- `src/lib/services/stockDressesService.test.js` — integration tests

**Modify:**
- `src/lib/services/stockDressesService.js` — v2 columns, tags, status, initial-quantity movements
- `src/lib/services/stockDressVariantsService.js` — drop quantity writes
- `src/routes/stock/+page.svelte` — new status filters
- `src/routes/stock/components/StockDressFilters.svelte`
- `src/routes/stock/components/StockDressCard.svelte`
- `src/routes/stock/components/StockDressFormFields.svelte`
- `src/routes/stock/components/VariantList.svelte`
- `src/routes/stock/components/StockDressDrawer.svelte`
- `src/routes/stock/new/+page.svelte`
- `src/routes/stock/[id]/edit/+page.svelte`

---

### Task 1: Test infrastructure + pricing module

**Files:**
- Create: `vitest.config.js`, `src/lib/stock/pricing.js`, `src/lib/stock/pricing.test.js`
- Modify: `package.json` (devDeps + `test` script)

**Interfaces:**
- Produces: `computeProfit(price, cost) -> number | null`, `computeMargin(price, cost) -> number | null`, `effectivePrice(dress, variant) -> number`

- [ ] **Step 1: Install Vitest**

```bash
bun add -d vitest
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

Create `vitest.config.js` with `test.environment: 'node'` and `test.include: ['src/**/*.test.js']`.

- [ ] **Step 2: Write the failing tests**

```js
// src/lib/stock/pricing.test.js
import { describe, it, expect } from "vitest";
import { computeProfit, computeMargin, effectivePrice } from "./pricing.js";

describe("computeProfit", () => {
  it("returns price minus cost", () => expect(computeProfit(70000, 30000)).toBe(40000));
  it("returns null when cost is missing", () => expect(computeProfit(70000, null)).toBe(null));
  it("returns null when price is missing", () => expect(computeProfit(null, 30000)).toBe(null));
  it("can be negative", () => expect(computeProfit(20000, 30000)).toBe(-10000));
});

describe("computeMargin", () => {
  it("returns a fraction of price", () => expect(computeMargin(70000, 30000)).toBeCloseTo(0.5714, 4));
  it("returns null when price is zero", () => expect(computeMargin(0, 30000)).toBe(null));
  it("returns null when cost is missing", () => expect(computeMargin(70000, null)).toBe(null));
});

describe("effectivePrice", () => {
  it("uses the variant override when set",
    () => expect(effectivePrice({ price: 70000 }, { price_override: 85000 })).toBe(85000));
  it("falls back to the dress price",
    () => expect(effectivePrice({ price: 70000 }, { price_override: null })).toBe(70000));
  it("falls back when there is no variant",
    () => expect(effectivePrice({ price: 70000 }, null)).toBe(70000));
  it("treats an override of 0 as a real price",
    () => expect(effectivePrice({ price: 70000 }, { price_override: 0 })).toBe(0));
});
```

- [ ] **Step 3: Run to verify failure**

Run: `bun run test`
Expected: FAIL — cannot resolve `./pricing.js`

- [ ] **Step 4: Implement `src/lib/stock/pricing.js`**

Three named exports with the signatures above. `null` means "not computable", distinct from `0`.

- [ ] **Step 5: Run to verify pass**

Run: `bun run test`
Expected: PASS, 11 tests

- [ ] **Step 6: Commit**

```bash
git add vitest.config.js package.json bun.lock src/lib/stock/pricing.js src/lib/stock/pricing.test.js
git commit -m "test: add vitest; feat(stock): pricing helpers"
```

---

### Task 2: Variant matrix generation

**Files:**
- Create: `src/lib/stock/variantMatrix.js`, `src/lib/stock/variantMatrix.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `generateVariantMatrix(axes, options?) -> { variants: AxisValue[][], truncated: boolean, total: number }` where `axes` is `{ axis: string, values: string[] }[]`, each generated variant is `{ axis, value }[]`, and `options` is `{ max?: number }` defaulting to `100`.

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/stock/variantMatrix.test.js
import { describe, it, expect } from "vitest";
import { generateVariantMatrix } from "./variantMatrix.js";

const size = { axis: "size", values: ["S", "M"] };
const color = { axis: "color", values: ["Red", "Blue"] };

describe("generateVariantMatrix", () => {
  it("returns one empty variant for no axes — the custom/make-to-order case", () => {
    expect(generateVariantMatrix([])).toEqual({ variants: [[]], truncated: false, total: 1 });
  });

  it("returns one variant per value for a single axis", () => {
    const { variants } = generateVariantMatrix([size]);
    expect(variants).toEqual([
      [{ axis: "size", value: "S" }],
      [{ axis: "size", value: "M" }],
    ]);
  });

  it("returns the cartesian product across axes", () => {
    const { variants, total } = generateVariantMatrix([size, color]);
    expect(total).toBe(4);
    expect(variants[0]).toEqual([
      { axis: "size", value: "S" },
      { axis: "color", value: "Red" },
    ]);
  });

  it("skips axes with no values", () => {
    const { variants } = generateVariantMatrix([size, { axis: "fabric", values: [] }]);
    expect(variants).toHaveLength(2);
  });

  it("caps output and flags truncation", () => {
    const big = [
      { axis: "size", values: ["A", "B", "C", "D", "E"] },
      { axis: "color", values: ["A", "B", "C", "D", "E"] },
      { axis: "fabric", values: ["A", "B", "C", "D", "E"] },
    ];
    const { variants, truncated, total } = generateVariantMatrix(big, { max: 20 });
    expect(total).toBe(125);
    expect(variants).toHaveLength(20);
    expect(truncated).toBe(true);
  });

  it("reports total without truncating under the cap", () => {
    expect(generateVariantMatrix([size, color], { max: 100 }).truncated).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun run test variantMatrix`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `generateVariantMatrix` in `src/lib/stock/variantMatrix.js`**

Compute `total` as the product of value counts *before* generating, so truncation is reported accurately without building the full list.

- [ ] **Step 4: Run to verify pass**

Run: `bun run test variantMatrix`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/stock/variantMatrix.js src/lib/stock/variantMatrix.test.js
git commit -m "feat(stock): variant matrix generation with cap"
```

---

### Task 3: Availability state + tag normalisation

**Files:**
- Create: `src/lib/stock/availability.js`, `src/lib/stock/availability.test.js`, `src/lib/stock/tags.js`, `src/lib/stock/tags.test.js`

**Interfaces:**
- Produces: `availabilityState(dress, totalQuantity) -> 'draft' | 'archived' | 'in_stock' | 'made_to_order' | 'sold_out'`, `availabilityLabel(state) -> string`, `normaliseTags(input) -> string[]`

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/stock/availability.test.js
import { describe, it, expect } from "vitest";
import { availabilityState, availabilityLabel } from "./availability.js";

const dress = (over = {}) => ({ status: "active", made_to_order: true, ...over });

describe("availabilityState", () => {
  it("draft wins over stock", () => expect(availabilityState(dress({ status: "draft" }), 5)).toBe("draft"));
  it("archived wins over stock", () => expect(availabilityState(dress({ status: "archived" }), 5)).toBe("archived"));
  it("in stock when quantity remains", () => expect(availabilityState(dress(), 2)).toBe("in_stock"));
  it("made to order at zero when remakeable", () => expect(availabilityState(dress(), 0)).toBe("made_to_order"));
  it("sold out at zero when not remakeable",
    () => expect(availabilityState(dress({ made_to_order: false }), 0)).toBe("sold_out"));
});

describe("availabilityLabel", () => {
  it("labels made_to_order for humans", () => expect(availabilityLabel("made_to_order")).toBe("Made to order"));
  it("labels sold_out", () => expect(availabilityLabel("sold_out")).toBe("Sold out"));
});
```

```js
// src/lib/stock/tags.test.js
import { describe, it, expect } from "vitest";
import { normaliseTags } from "./tags.js";

describe("normaliseTags", () => {
  it("trims whitespace", () => expect(normaliseTags(["  zari "])).toEqual(["zari"]));
  it("drops empty and whitespace-only entries", () => expect(normaliseTags(["", "   ", "zari"])).toEqual(["zari"]));
  it("removes duplicates case-insensitively", () => expect(normaliseTags(["Zari", "zari"])).toEqual(["Zari"]));
  it("preserves order of first appearance", () => expect(normaliseTags(["b", "a", "b"])).toEqual(["b", "a"]));
  it("splits a comma-separated string", () => expect(normaliseTags("bridal, zari")).toEqual(["bridal", "zari"]));
  it("returns an empty array for null", () => expect(normaliseTags(null)).toEqual([]));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun run test availability tags`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement both modules**

`availabilityState` evaluates status before quantity. `normaliseTags` accepts an array or a comma-separated string and keeps the first-seen casing.

- [ ] **Step 4: Run to verify pass**

Run: `bun run test availability tags`
Expected: PASS, 13 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/stock/availability.js src/lib/stock/availability.test.js src/lib/stock/tags.js src/lib/stock/tags.test.js
git commit -m "feat(stock): availability state and tag normalisation"
```

---

### Task 4: Service layer on v2 columns

**Files:**
- Modify: `src/lib/services/stockDressesService.js`, `src/lib/services/stockDressVariantsService.js`
- Create: `src/lib/services/stockDressesService.test.js`

**Interfaces:**
- Consumes: `normaliseTags` (Task 3)
- Produces: unchanged function names. `createStockDressWithDetails(formData)` and `updateStockDressWithDetails(dressId, formData)` now take `formData.dress` with v2 keys (`price`, `cost`, `compare_at_price`, `description`, `notes`, `tags`, `made_to_order`, `track_quantity`, `weight_grams`, `length_cm`, `width_cm`, `height_cm`, `status`), and each entry of `formData.variants` as `{ id?, price_override, quantity, axisValues: {axis, value}[] }`.

Integration tests run against the local stack at `postgresql://postgres:postgres@127.0.0.1:54322/postgres` via the app's own Supabase client. They require `supabase start`.

- [ ] **Step 1: Write the failing integration tests**

```js
// src/lib/services/stockDressesService.test.js
import { describe, it, expect, afterEach } from "vitest";
import { createStockDressWithDetails, getStockDressById, updateStockDressWithDetails,
         archiveStockDress, listStockDresses } from "./stockDressesService.js";

const base = {
  name: "Test Farshi", garment_type: "Farshi Lehenga", category: "bridal",
  price: 70000, cost: 30000, compare_at_price: 95000,
  description: "d", notes: "n", tags: ["bridal", "zari"],
  made_to_order: true, track_quantity: true, status: "active",
};

describe("createStockDressWithDetails", () => {
  it("assigns a GSP sku", async () => {
    const { data } = await createStockDressWithDetails({ dress: base, images: [], options: [], variants: [] });
    expect(data.sku).toMatch(/^GSP-\d{5}$/);
  });

  it("persists v2 pricing and tags", async () => {
    const { data } = await createStockDressWithDetails({ dress: base, images: [], options: [], variants: [] });
    const { data: full } = await getStockDressById(data.id);
    expect(full.price).toBe("70000.00");
    expect(full.compare_at_price).toBe("95000.00");
    expect(full.tags).toEqual(["bridal", "zari"]);
  });

  it("records initial quantity as a received movement, not a direct write", async () => {
    const { data } = await createStockDressWithDetails({
      dress: base, images: [], options: [],
      variants: [{ price_override: null, quantity: 3, axisValues: [{ axis: "size", value: "M" }] }],
    });
    const { data: full } = await getStockDressById(data.id);
    expect(full.stock_dress_variants[0].quantity).toBe(3);
    expect(full.stock_dress_variants[0].sku).toBe(`${data.sku}-M`);
  });

  it("creates no movement when quantity is zero", async () => {
    const { data } = await createStockDressWithDetails({
      dress: base, images: [], options: [],
      variants: [{ price_override: null, quantity: 0, axisValues: [{ axis: "size", value: "S" }] }],
    });
    const { data: full } = await getStockDressById(data.id);
    expect(full.stock_dress_variants[0].quantity).toBe(0);
  });

  it("builds a multi-axis sku from axis values", async () => {
    const { data } = await createStockDressWithDetails({
      dress: base, images: [], options: [],
      variants: [{ price_override: null, quantity: 0,
        axisValues: [{ axis: "size", value: "M" }, { axis: "color", value: "Red" }] }],
    });
    const { data: full } = await getStockDressById(data.id);
    expect(full.stock_dress_variants[0].sku).toBe(`${data.sku}-RED-M`);
  });

  it("surfaces the compare_at constraint as an error, not a throw", async () => {
    const { error } = await createStockDressWithDetails({
      dress: { ...base, compare_at_price: 1000 }, images: [], options: [], variants: [],
    });
    expect(error).toBeTruthy();
  });
});

describe("updateStockDressWithDetails", () => {
  it("archives a removed variant instead of deleting it", async () => {
    const { data } = await createStockDressWithDetails({
      dress: base, images: [], options: [],
      variants: [{ price_override: null, quantity: 1, axisValues: [{ axis: "size", value: "M" }] }],
    });
    const { data: full } = await getStockDressById(data.id);
    await updateStockDressWithDetails(data.id, {
      dress: base, currentImages: full.stock_dress_images, images: [],
      currentOptions: full.stock_dress_options, options: [],
      currentVariants: full.stock_dress_variants, variants: [],
    });
    const { data: after } = await getStockDressById(data.id);
    expect(after.stock_dress_variants[0].status).toBe("archived");
  });

  it("does not reset quantity on save", async () => {
    const { data } = await createStockDressWithDetails({
      dress: base, images: [], options: [],
      variants: [{ price_override: null, quantity: 5, axisValues: [{ axis: "size", value: "L" }] }],
    });
    const { data: full } = await getStockDressById(data.id);
    await updateStockDressWithDetails(data.id, {
      dress: { ...base, name: "Renamed" },
      currentImages: [], images: [], currentOptions: [], options: [],
      currentVariants: full.stock_dress_variants,
      variants: full.stock_dress_variants.map((v) => ({ id: v.id, price_override: 80000, quantity: v.quantity, axisValues: [{ axis: "size", value: "L" }] })),
    });
    const { data: after } = await getStockDressById(data.id);
    expect(after.stock_dress_variants[0].quantity).toBe(5);
  });
});

describe("listStockDresses", () => {
  it("returns rows with the fields the catalog renders", async () => {
    await createStockDressWithDetails({ dress: base, images: [], options: [], variants: [] });
    const { data } = await listStockDresses();
    expect(data[0]).toHaveProperty("price");
    expect(data[0]).toHaveProperty("tags");
    expect(data[0]).toHaveProperty("made_to_order");
  });
});

describe("archiveStockDress", () => {
  it("sets status to archived", async () => {
    const { data } = await createStockDressWithDetails({ dress: base, images: [], options: [], variants: [] });
    await archiveStockDress(data.id);
    const { data: after } = await getStockDressById(data.id);
    expect(after.status).toBe("archived");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `supabase start --exclude logflare,vector && bun run test stockDressesService`
Expected: FAIL — services still write `base_price` / `production_cost`

- [ ] **Step 3: Rewrite the services**

In `stockDressesService.js`: rename `base_price`→`price`, `production_cost`→`cost`; pass through `description`, `notes`, `tags` (via `normaliseTags`), `compare_at_price`, `made_to_order`, `track_quantity`, `weight_grams`, `length_cm`, `width_cm`, `height_cm`. Extend the `getStockDressById` select to include `stock_dress_variants (*, stock_dress_variant_values (*))`. In `createStockDressWithDetails`, after inserting a variant and its axis values, insert a `received` movement when `quantity > 0` — never write `quantity` directly. In `updateStockDressWithDetails`, drop `quantity` from the variant update payload entirely.

In `stockDressVariantsService.js`: remove `quantity` from `createVariant` and `updateVariant` payloads.

- [ ] **Step 4: Run to verify pass**

Run: `bun run test stockDressesService`
Expected: PASS, 10 tests

- [ ] **Step 5: Reset the local DB to clear test rows**

Run: `supabase db reset`

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/
git commit -m "feat(stock): service layer on v2 schema; initial quantity via ledger"
```

---

### Task 5: Catalog page, filters and card

**Files:**
- Modify: `src/routes/stock/+page.svelte`, `src/routes/stock/components/StockDressFilters.svelte`, `src/routes/stock/components/StockDressCard.svelte`

**Interfaces:**
- Consumes: `availabilityState`, `availabilityLabel` (Task 3), `effectivePrice` (Task 1), `listStockDresses` (Task 4)

- [ ] **Step 1: Update the status filter to v2**

Filter options become `Active / Drafts / Archived`, matching `product_status`. Remove `available`, `reserved`, `sold`. Default view shows `active` only — drafts and archived are opt-in.

- [ ] **Step 2: Update `StockDressCard.svelte`**

Render `price`, and when `compare_at_price` is set show it struck through beside it. Show the availability badge from `availabilityState(dress, totalQuantity)` where `totalQuantity` sums `quantity` across the dress's non-archived variants. Never render `cost`.

- [ ] **Step 3: Extend search to cover SKU and tags**

Search matches `name`, `garment_type`, `sku`, and any entry in `tags`, case-insensitively.

- [ ] **Step 4: Verify in the browser**

Run: `bun run dev`, open `/stock`.
Expected: active dresses listed; switching the filter reveals drafts and archived; a dress with `compare_at_price` shows a struck-through price; a dress with `quantity 0` and `made_to_order` shows "Made to order".

- [ ] **Step 5: Commit**

```bash
git add src/routes/stock/+page.svelte src/routes/stock/components/StockDressFilters.svelte src/routes/stock/components/StockDressCard.svelte
git commit -m "feat(stock): catalog on v2 statuses, pricing and availability"
```

---

### Task 6: Form fields — new v2 inputs

**Files:**
- Modify: `src/routes/stock/components/StockDressFormFields.svelte`

**Interfaces:**
- Consumes: `computeProfit`, `computeMargin` (Task 1), `normaliseTags` (Task 3)
- Produces: bindable props gain `description`, `tags`, `compareAtPrice`, `madeToOrder`, `trackQuantity`, `weightGrams`, `lengthCm`, `widthCm`, `heightCm`. `basePrice` is renamed `price`, `productionCost` renamed `cost`. Each option value becomes `{ id?, value, price_adjustment }`.

- [ ] **Step 1: Add the Basics fields**

`description` (textarea, customer-facing) alongside the existing `notes` (textarea, internal — label it so the difference is obvious). `tags` as a chip input reusing the option-value chip pattern already in this file.

- [ ] **Step 2: Add the Pricing section**

`price`, `compare_at_price`, `cost`, plus **read-only** Profit and Margin derived live via `$derived` from `computeProfit` / `computeMargin`. Margin renders as a percentage to one decimal. Guard `compare_at_price <= price` in the form with an inline message before submit, so the DB `CHECK` is never the thing that tells the user.

- [ ] **Step 3: Add the Inventory section**

`track_quantity` and `made_to_order` as checkboxes, with one line of help text each explaining the consequence — `made_to_order` keeps a sold-out design orderable.

- [ ] **Step 4: Add the Shipping section**

`weight_grams`, `length_cm`, `width_cm`, `height_cm`, all optional, collapsed by default since they are usually blank.

- [ ] **Step 5: Add price adjustment to option values**

`stock_dress_option_values.price_adjustment` has existed since v1 and no UI
has ever written it, so every option is silently free. Each option-value
chip gains an optional amount, shown as `Hand-painted +40,000`. Blank means
`0`. `createStockDressWithDetails` and `updateStockDressWithDetails` already
pass option values through; include `price_adjustment` in that payload.

- [ ] **Step 6: Verify in the browser**

Run: `bun run dev`, open `/stock/new`.
Expected: typing a cost updates Profit and Margin immediately; a `compare_at_price` below `price` shows the inline message and blocks submit; tags add and remove as chips; an option value with an amount reads `Hand-painted +40,000`, and reopening the dress in edit shows that amount again.

- [ ] **Step 7: Commit**

```bash
git add src/routes/stock/components/StockDressFormFields.svelte src/lib/services/stockDressesService.js
git commit -m "feat(stock): v2 form fields — pricing, tags, inventory, shipping, option price adjustments"
```

---

### Task 7: Multi-axis variant editor

**Files:**
- Modify: `src/routes/stock/components/VariantList.svelte`

**Interfaces:**
- Consumes: `generateVariantMatrix` (Task 2)
- Produces: each variant in the bound array is `{ id?, sku?, barcode?, price_override, quantity, axisValues: {axis, value}[], status }`

- [ ] **Step 1: Replace the single `size` field with axis definitions**

Above the variant list, let the user define axes — pick from `size | color | fabric | other` and add values as chips. This is the same interaction as the Options section; the distinction is that these generate countable, SKU'd rows.

- [ ] **Step 2: Generate the matrix**

A "Generate variants" button calls `generateVariantMatrix(axes, { max: 100 })` and fills the table. When `truncated` is true, show the count that was skipped — do not silently drop rows.

- [ ] **Step 3: Make quantity read-only for existing variants**

A saved variant shows its quantity as text with a note that it is changed by recording a movement. A **new, unsaved** variant keeps an editable quantity, which becomes its opening `received` movement (Task 4).

- [ ] **Step 4: Show SKU and barcode**

Both read-only, `(assigned on save)` until they exist.

- [ ] **Step 5: Remove means archive**

Removing a saved variant marks it archived rather than deleting it, so a variant with movement history never hits the FK restriction.

- [ ] **Step 6: Verify in the browser**

Run: `bun run dev`, open `/stock/new`.
Expected: defining size S/M + colour Red/Blue and generating produces 4 rows; quantity is editable before save and read-only after; removing a saved variant hides it without an error.

- [ ] **Step 7: Commit**

```bash
git add src/routes/stock/components/VariantList.svelte
git commit -m "feat(stock): multi-axis variant matrix editor"
```

---

### Task 8: Wire create and edit pages

**Files:**
- Modify: `src/routes/stock/new/+page.svelte`, `src/routes/stock/[id]/edit/+page.svelte`

**Interfaces:**
- Consumes: Tasks 4, 6, 7

- [ ] **Step 1: Update both pages' state to the v2 field set**

Rename `basePrice`→`price`, `productionCost`→`cost`; add `description`, `tags`, `compareAtPrice`, `madeToOrder`, `trackQuantity` and the four shipping fields. Pass them all through to `StockDressFormFields`.

- [ ] **Step 2: Map variants to the new shape in `buildFormData`**

Each variant carries `axisValues` as an array, not a single `size` string.

- [ ] **Step 3: Update the edit page's seeding**

Seed `axisValues` from each variant's `stock_dress_variant_values`, keeping `currentVariants` as the diff snapshot.

- [ ] **Step 4: Require a price when publishing, not when drafting**

Publishing with a blank or zero price blocks with an inline message. Save Draft allows it. This is why `status` defaults to `draft` in the schema.

- [ ] **Step 5: Update the status buttons**

Draft shows Save Draft + Publish (→ `active`). A non-draft shows Save Changes and keeps its existing status.

- [ ] **Step 6: Verify the full round trip**

Run: `bun run dev`.
Expected: create a dress with 2 axes and quantity → appears in the catalog with correct quantity; reopen it in edit → every field repopulates; publishing a draft with no price is blocked; publishing with a price moves it to Active.

- [ ] **Step 7: Commit**

```bash
git add src/routes/stock/new/+page.svelte src/routes/stock/[id]/edit/+page.svelte
git commit -m "feat(stock): create and edit pages on v2"
```

---

### Task 9: Detail drawer

**Files:**
- Modify: `src/routes/stock/components/StockDressDrawer.svelte`

**Interfaces:**
- Consumes: `availabilityState`, `availabilityLabel`, `effectivePrice`

- [ ] **Step 1: Update the info grid to v2**

Show price with `compare_at_price` struck through when set, the availability badge, tags, and `made_to_order`. Show `description`; show `notes` under an "Internal" heading. Never show `cost`.

- [ ] **Step 2: Show variants with all their axes**

The read-only variant list renders every axis value, not just size, plus SKU, barcode and quantity. Archived variants stay filtered out.

- [ ] **Step 3: Verify in the browser**

Run: `bun run dev`, open `/stock` and click a dress.
Expected: a multi-axis variant reads "Size M · Colour Red"; a discounted dress shows both prices; cost appears nowhere.

- [ ] **Step 4: Full check and commit**

```bash
bun run test && bun run check
git add src/routes/stock/components/StockDressDrawer.svelte
git commit -m "feat(stock): detail drawer on v2"
```

---

## Done when

- `bun run test` passes (unit + integration).
- `bun run check` reports no new errors.
- A dress can be created with multiple axes, quantity, tags and a compare-at price; listed; filtered by active/draft/archived; edited; and archived.
- Quantity is never written outside the ledger.
