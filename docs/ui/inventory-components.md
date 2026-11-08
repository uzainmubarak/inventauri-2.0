# Inventory UI — sub-components

Scope: the Stock module (`src/routes/stock/`). Build each one as a primitive or a
feature component, one folder per component. Status: `have` = exists, `restyle` = exists
but needs the design pass, `new` = to build.

## Primitives (`src/lib/ui/`)

| Component | Status | Used for |
|---|---|---|
| Button | have, restyle | Add, save, cancel, row actions |
| Input | have, restyle | Text and number fields (first target) |
| Textarea | have, restyle | Description, internal notes |
| Label | have, restyle | Every field label |
| Checkbox | have | Track quantity, made to order, flags |
| Switch | have | On/off toggles |
| Badge | have, restyle | Availability state, status (contrast on `plain` is low) |
| Card | have | Dress tile shell |
| Table | have | Variant table, movement history |
| Icon | have | Shared icon set |
| Select / Combobox | new | Category, subcategory, garment type, borrower dropdown |
| Tag input | new | Tags (chips, add on Enter/comma, dedupe) |
| Number field with unit | new | Price, cost, weight, dimensions (Rs, g, cm) |
| Image uploader | new | Image list, set primary, drag to reorder |
| Drawer / Sheet | new | Read-only dress view |
| Dialog | new | Confirm archive, confirm loan |
| Filter bar | new | Search + status/category/size pills |
| Empty state | new | No dresses, no matches |
| Toast | new | "Saved", errors |

## Feature components (`src/routes/stock/components/`)

| Component | Status | Used for |
|---|---|---|
| StockDressGrid | have | Grid of dress cards |
| StockDressCard | have, restyle | One dress: image, name, price, badge, tags |
| StockDressFilters | have, restyle | Search and filter controls |
| StockDressDrawer | have, restyle | Read-only detail: price, availability, options, notes |
| StockDressFormFields | have, restyle | Create and edit form sections |
| VariantList | have, restyle | Axis builder, generate variants, variant rows |

## New feature components to plan

| Component | Used for |
|---|---|
| OptionEditor | One option (e.g. Colour) with its values and price adjustment. The Options box rework starts here. |
| OptionValueChip | A single value inside an option, with price adjustment and remove |
| VariantRow | One variant: axes, SKU, barcode, price override, quantity, status |
| PricingPanel | Price, compare-at, cost, live profit and margin |
| InventoryPanel | Track-quantity checkbox (dress level), quantity input (dress level; counts only when there are no variants, otherwise stored and hidden). Sits below Pricing, above Shipping. Shows this note when variants exist: "Quantity entered here is replaced by the variant quantities." |
| ShippingPanel | Weight or dimensions (collapsed by default) |
| MovementHistory | Ledger list for one variant |
| LoanForm | Record a loan: borrower dropdown, expected return |
| BorrowerPicker | Borrower dropdown with "add new" link to Settings |
| StatusBadge | Wraps Badge with availability mapping from `availabilityState` |

## Rules for the design chat
- Tokens only (from `src/app.css`), no hard-coded colours.
- Every component: one folder, `index.js` entry, props documented in a comment.
- Tests only for logic. Visual checks in the browser.

## Inventory decisions
- Options define axes (Colour, Size, Fabric). Variants are the combinations.
- With variants, quantity lives on each variant. The dress-level count is hidden in the UI.
- The dress-level count is kept underneath and is not changed by variant movements. If all variants are deleted, it reappears with its last value (Shopify's behaviour).
- **Rule:** once a dress has variants, the dress-level quantity input stays editable but shows the note: "Quantity entered here is replaced by the variant quantities." The value is saved as a dress-level movement, kept apart from variant stock, and hidden. Variant quantities are what count.
- **Track quantity** is one checkbox on the dress. When on, the Variants table shows a Quantity column.
- No default variant. A dress with no options has no variant row.
- No "sell when out of stock" in inventory. Selling a piece that hasn't reached the rack is an order.
- Made-to-order is not an inventory concept. It moves to the order side as a customisation flag. Removed from the Inventory panel.

## Make-to-order timeline
- Each make-to-order dress has a lead time, for example 2 to 4 weeks. Stored as a minimum and maximum, in weeks.
- The customer sees the lead time on the dress. It is not an inventory quantity.
- Not in the schema yet. Lead time fields would be added to `stock_dresses` when we build the order side.
- Only units on the rack enter inventory.

## Variant page (one variant's own fields)
Opened by clicking a variant in the Variants list. Same layout idea as Shopify's variant page: a variant list on the left, the selected variant's sections on the right.

- **Header:** option values (e.g. size "M", fabric "Net"), status (active or archived).
- **Images:** the variant's own photos. Set one as primary.
- **Price:** price override (falls back to the dress price), compare-at price, cost.
- **Inventory:** tracked toggle, quantity on hand, SKU, barcode. No locations, no "sell when out of stock".
- **Shipping:** weight, packed size (L × W × H), for the courier.
- **Not on the variant page:** channels, catalogs, title, description, options. These stay at dress level.
- **Options:** kept as they are now. Choices with a price adjustment, no stock, no variant page.

**Schema:**
- `stock_dress_variants`: `compare_at_price`, `cost`, `track_quantity`, `weight_grams`, `length_cm`, `width_cm`, `height_cm`.
- `stock_dress_images`: `variant_id` (null = dress photo, set = that variant's photo). One primary photo per variant.
- Null on any variant field means the dress value is used.

## Resolved
- Dress with no variants: the dress holds the count. Dress with variants: each variant holds its own count, and the dress-level count is hidden and kept apart from variant stock.

## Open
- Editing a dress with no variants can't record a movement yet. Needs a "record movement" action.
- Form field for dress-level opening stock (no variants) is not built yet.
