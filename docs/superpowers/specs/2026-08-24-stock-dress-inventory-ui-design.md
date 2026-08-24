# Stock Dress Inventory UI — Design

**Date**: 2026-08-24
**Feature**: F17 — Stock Dress Inventory (see [`docs/inventauri_requirements.md` §7a](../../inventauri_requirements.md))
**Status**: Approved, ready for implementation planning

## Context

The database schema for Stock Dress Inventory already exists and is tested locally (`supabase/migrations/20260812000000_stock_dress_inventory.sql`): 6 tables (`stock_dresses`, `stock_dress_images`, `stock_dress_options`, `stock_dress_option_values`, `stock_dress_variants`, `stock_dress_variant_values`), auto-generated SKUs (`GSP-00001` at the dress level, `GSP-00001-M` etc. at the variant level via axis values), and RLS enabled (currently scoped to `authenticated` in the real migration, plus a **local-only** `anon` allowance in `supabase/seed.sql` until Auth ships).

This spec covers the **frontend UI** for that schema: a card-grid catalog of finished ready-made dresses, distinct from made-to-order production tracking.

The app runs in two environments: a Tauri desktop app on Mac (always-visible sidebar, wide viewport) and a Cloudflare Pages PWA accessed from phones/tablets (no fixed sidebar space, narrow viewport). This is the first feature module built with mobile in mind from the start — the UI must work well in both.

## Architecture

### Route

- `src/routes/stock/+page.svelte` — the card-grid catalog: list, filters, search, "add new" entry point.
- Detail view is a component (`StockDressDrawer.svelte`), not a separate route — it renders as a slide-out drawer on desktop/tablet and a full-screen overlay on mobile via a CSS breakpoint, not a route change.

### Navigation

The existing `src/ui/sidebar/menu.config.ts` already has a "Stock → Inventory" entry (`/inventory`, F11 raw-materials inventory — a different feature, currently an empty route). Add a second item under the same "Stock" section:

```ts
{ name: "Stock Dresses", link: "/stock", icon: "👗" }
```

Both features coexist under one sidebar section without conflict.

### Mobile navigation shell

Below `768px`, the existing dark sidebar (`Sidebar.svelte`) is replaced by a **bottom tab bar** fixed to the viewport bottom:

- Pinned tabs: **Dashboard, Orders, Stock, Karigar Dashboard** (the 4 sections used most while away from the studio).
- A 5th **"More"** tab opens a bottom sheet listing the rest: Design Library, Contacts, Agent Ledger, Settings.
- This is a shell-level change (affects the whole app, not just Stock), but Stock is the first screen built mobile-first, so it's the natural place to introduce it. Implementation: a new `MobileTabBar.svelte`, conditionally rendered in `+layout.svelte` alongside (not replacing) `Sidebar.svelte`, toggled by a CSS media query — `Sidebar.svelte` itself is untouched.

### Components

New directory `src/routes/stock/components/` (colocated with the route since nothing else reuses these):

- **`StockDressGrid.svelte`** — grid container. Column count: 4 (desktop, ≥1024px) → 2 (tablet, 768–1023px) → 1 (mobile, <768px).
- **`StockDressCard.svelte`** — one catalog card. Square layout (image on top) at desktop/tablet widths; horizontal layout (image left, details right) at mobile width. Shows: primary image, name, category + subcategory, price, status badge. Price shown is the **lowest `price_override` among the dress's non-archived variants, falling back to `base_price` if no variant has an override or the dress has no variants** — i.e. "starting from" pricing, computed client-side from the already-fetched variant list, not a separate query.
- **`StockDressFilters.svelte`** — search input (name / garment type) + filter selects (category, subcategory, size type, status). Subcategory select only enabled/shown when category = bridal.
- **`StockDressForm.svelte`** — add/edit form. Single scrolling page, sectioned: (1) Basics (name, garment type, category/subcategory, base price, production cost, notes), (2) Images (manual URL paste, ordered list, mark-as-primary), (3) Options (name + value list, e.g. "Dupatta Style" → "Plain"/"Painted"), (4) Variants (see `VariantList.svelte`). Same layout on all screen sizes — only width reflows.
- **`StockDressDrawer.svelte`** — detail view. Slide-out panel (desktop/tablet) or full-screen overlay (mobile), same content either way: all images, full details, options, variants table, edit/archive actions.
- **`VariantList.svelte`** — repeating variant editor within the form, and the read-only variant table within the drawer. Table-style rows (SKU, size/color axis values, quantity, price override, status) on desktop/tablet; stacked cards (one field-per-line) on mobile. SKU is always read-only/display-only in the UI — never an editable input, since the database generates it.

### Data layer

Service files in `src/lib/services/`, following the existing convention (see `staffService.js`) — one file per table, each function returns `{ data, error }`:

- `stockDressesService.js` (already scaffolded: `listStockDresses`, `getStockDressById`, `createStockDress`) — extend with `updateStockDress`, `archiveStockDress` (soft-delete: sets `status = 'archived'`, never a hard `DELETE`, matching the Available/Reserved/Sold/Archived model).
- `stockDressImagesService.js` — `listImagesForDress`, `addImage`, `setPrimaryImage`, `deleteImage`, `reorderImages`.
- `stockDressOptionsService.js` / option values — `listOptionsForDress`, `createOption`, `addOptionValue`, `deleteOption`, `deleteOptionValue`.
- `stockDressVariantsService.js` — `listVariantsForDress`, `createVariant`, `updateVariant`, `archiveVariant`.
- `stockDressVariantValuesService.js` — `setVariantAxisValue`, `removeVariantAxisValue` (insert/update/delete against `stock_dress_variant_values`, which is what actually triggers SKU recomputation in the database).

**Orchestration**: creating a dress with images/options/variants in one form submission requires several sequential inserts (dress → images → options → option values → variant shells → variant axis values, in that dependency order). This is wrapped as one `createStockDressWithDetails(formData)` function in `stockDressesService.js` so `StockDressForm.svelte` calls a single function and doesn't need to know insert ordering or handle partial-failure bookkeeping itself.

## Scope

**In this pass:**
- Full CRUD: create, list, view (drawer), edit, archive.
- Filters (category, subcategory, size type, status) and search (name / garment type) — built now, not deferred, since the catalog isn't very usable without them past a handful of entries.
- Images as a manual URL-paste field (no file picker, no actual upload).
- Mobile bottom-tab-bar navigation shell.
- Responsive layout at all three breakpoints for grid, cards, drawer, and variant list.

**Explicitly out of scope for this pass** (tracked as known follow-ups, not forgotten):
- Real Cloudflare R2 file upload — the image field only accepts a URL string for now. Swapping in real upload later only touches the image-picker sub-component, not the schema or the rest of the form.
- Auth/login — doesn't exist yet. The app continues to rely on the local-only `anon` RLS policies in `supabase/seed.sql` for local dev; this UI is built against the same `authenticated`-scoped production RLS policies regardless, so no rework is needed once Auth ships and the local seed policies are deleted.
- Barcode label printing or scanning.

## Error handling

Consistent with the existing pattern in `src/routes/+page.svelte`: no modals or toast library. Loading/error state is local `$state` per component (`loading`, `error`), errors rendered as inline text near the relevant control. Form submission failures (e.g. a Postgres constraint violation) show the raw error message inline near the Save button — acceptable for a single-user/two-user internal tool at this stage; can be revisited if it proves confusing in practice.

## Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px – 1023px
- **Desktop**: ≥ 1024px

Matches common convention and the project's existing Browser-tooling device presets (mobile/tablet/desktop).

## Testing

No automated test suite exists in this project yet. Verification will be manual: exercise create/edit/archive flows and filter/search behavior against the local Supabase instance (`supabase start`, per the local-dev workflow already established), at each of the three breakpoints, before considering the module done.
