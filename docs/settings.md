# Settings

What the Settings page holds. Each section says what to build and what the code already does.

## Stock → SKUs

**Status:** the database, services and SKU generation are built. The Settings page is not.

A SKU is an input. It can be generated automatically, or the user types their own.

### The switch
- **Autogenerate SKUs**, on or off.
- **On:** when a dress or variant is saved without a SKU, one is generated from the format below.
- **Off:** nothing is generated. SKU fields are plain inputs and can be left blank.
- A SKU the user types is always kept, in either mode.

### The format
Shown under the switch. Disabled while autogenerate is off, but the values are kept.

| Field | What it is | Allowed | Default |
|---|---|---|---|
| Prefix | Letters at the start of every SKU | A to Z and 0 to 9, up to 10 characters, can be empty. Uppercase as the user types. | `GSP` |
| Separator | Goes between the parts | `-`, `_` or `.` | `-` |
| Digits | Length of the number, padded with zeros | 1 to 10 | `5` |

Show a live preview under the fields, worked out from what is typed (not saved until Save):
- Dress: `GSP-00018`
- Variant: `GSP-00018-RED-M`

### How a SKU is built
- **Dress:** prefix, separator, number. For example `GSP-00018`. With no prefix it is just the number, `00018`.
- **Number:** one shared counter that only goes up. It can skip a number (a failed save still uses one). A number longer than the digits is never cut.
- **Variant:** the dress SKU, then the variant's option values, ordered by axis (colour, fabric, other, size) and uppercased, joined with the separator. For example `GSP-00018-RED-M`. A variant with no values keeps the bare dress SKU.

### Rules
- Generated once, when the dress or variant is first saved. Renaming a dress or changing an option value later never changes an existing SKU.
- A typed dress SKU is kept even with autogenerate on. Its variants are built from it.
- A SKU can be edited at any time. A blank one is saved as empty. Editing a SKU never changes the barcode, because a printed label has to keep matching.
- Unique among dresses, and unique among variants.
- If a generated SKU is already taken by a typed one, that save fails once with a duplicate error. Saving again takes the next number.
- Changing the format only affects SKUs generated afterwards. Existing SKUs are not rewritten, and the counter does not restart when the prefix changes.

### Where SKUs show (for the designer)
- **Dress form:** an optional SKU field. Placeholder "Generated when you save" with autogenerate on, "Optional" with it off.
- **Variant rows and the variant page:** the SKU becomes an editable input, with the same placeholder rule. It is read-only today, with the hint "Set from the dress and its option values", which no longer applies.
- **Everywhere a SKU is displayed it can be empty.** Show nothing or a dash, never `null`, and no dangling "·" (the stock table shows " · Farshi Lehenga" today when there is no SKU).

### What is already built
- Table `stock_settings`, one row: `sku_autogenerate`, `sku_prefix`, `sku_separator`, `sku_digits`.
- `src/lib/services/stockSettingsService`: `getStockSettings`, `updateStockSettings`, `nextSkuNumber`. The page reads with the first and saves with the second, sending only the fields that changed.
- `src/lib/stock/sku`: builds the strings. The dress form's save (`createStockDressWithDetails`, `updateStockDressWithDetails`) applies it.
- The database never builds a SKU. It only hands out the next number (`next_stock_sku_number()`).
- Any signed-in user can change this today. Restrict it to admins when roles exist.

## Stock → Borrowers

**Status:** the table `stock_borrowers` exists. No service and no page yet.

Who is allowed to borrow a display sample. The loan form's dropdown lists only these people (`BorrowerPicker`, see `docs/ui/inventory-components.md`). Someone new registers here.

- Fields: name (required), type (karigar, photographer, vendor, staff or other), phone, CNIC (optional, 13 digits, dashes optional), note, active.
- Deactivate instead of deleting. They leave the dropdown, and their loan history stays readable.
- Do not enter real CNICs until Auth ships. See `docs/stock-module-schema.md`, section 7.
