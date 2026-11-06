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
| InventoryPanel | Track-quantity toggle, made-to-order toggle, opening stock |
| ShippingPanel | Weight or dimensions (collapsed by default) |
| MovementHistory | Ledger list for one variant |
| LoanForm | Record a loan: borrower dropdown, expected return |
| BorrowerPicker | Borrower dropdown with "add new" link to Settings |
| StatusBadge | Wraps Badge with availability mapping from `availabilityState` |

## Rules for the design chat
- Tokens only (from `src/app.css`), no hard-coded colours.
- Every component: one folder, `index.js` entry, props documented in a comment.
- Tests only for logic. Visual checks in the browser.
