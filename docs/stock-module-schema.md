# Stock Module — Schema v2

Design agreed in conversation (Oct–Nov 2026). Replaces the v1 schema in
`supabase/migrations/20260812000000_stock_dress_inventory.sql`, which was
never pushed to production — so it gets rewritten in place rather than
patched with ALTERs.

Source layout: `details/product/product-page.excalidraw`

---

## Business model this encodes

Golden Studio sells the same design two ways at once:

- **Ready-made** — the physical sample on the rack
- **Make-to-order** — the same design, newly made, ~3 weeks

Selling the sample therefore does **not** make the design unavailable. Physical
stock and design availability are independent, which is why `quantity` and
`made_to_order` are separate fields.

Most designs have a single sample. A minority are stocked in multiple
colours and sizes.

Samples degrade over time ("rusty"), so old designs get discounted and sold
off — which is what `compare_at_price` is for.

---

## Enums

```sql
CREATE TYPE stock_category    AS ENUM ('party_wear','formals','bridal','nikkah_wear');
CREATE TYPE stock_subcategory AS ENUM ('mehendi','barat','walima');

CREATE TYPE product_status    AS ENUM ('active','draft','archived');
CREATE TYPE variant_status    AS ENUM ('active','archived');

CREATE TYPE variant_axis      AS ENUM ('size','color','fabric','other');

CREATE TYPE borrower_type     AS ENUM ('karigar','photographer','vendor','staff','other');

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
```

**Gone from v1:** `stock_status` (`draft|available|reserved|sold|archived`).
It conflated product state with physical state and was applied to both
products and variants. Split into `product_status` + `variant_status`;
`reserved` and `sold` are now expressed by quantity and the ledger.

---

## 1. `stock_dresses`

```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
sku               TEXT UNIQUE NOT NULL DEFAULT ''   -- GSP-00001, trigger-assigned
name              TEXT NOT NULL
description       TEXT              -- customer-facing
notes             TEXT              -- internal only
garment_type      TEXT NOT NULL     -- "Farshi Lehenga"
category          stock_category NOT NULL
subcategory       stock_subcategory -- bridal only
tags              TEXT[] NOT NULL DEFAULT '{}'

cost              NUMERIC(12,2)     -- internal, was production_cost
price             NUMERIC(12,2) NOT NULL  -- was base_price
compare_at_price  NUMERIC(12,2)     -- struck-through "was" price

status            product_status NOT NULL DEFAULT 'draft'
track_quantity    BOOLEAN NOT NULL DEFAULT true
made_to_order     BOOLEAN NOT NULL DEFAULT true

weight_grams      INTEGER
length_cm         NUMERIC(6,2)
width_cm          NUMERIC(6,2)
height_cm         NUMERIC(6,2)

created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()

CONSTRAINT subcategory_bridal_only
  CHECK (subcategory IS NULL OR category = 'bridal')
CONSTRAINT compare_at_above_price
  CHECK (compare_at_price IS NULL OR compare_at_price > price)
```

Renames from v1: `production_cost` → `cost`, `base_price` → `price`.
`profit` and `margin` are **not** columns — computed live in the form as
`price - cost` and `(price - cost) / price`. Storing them would let them go
stale.

Shipping fields are all nullable pending confirmation from the courier on
whether they price by weight or volume.

### Display states

| quantity | made_to_order | status | Shows as |
|---|---|---|---|
| > 0 | — | active | In stock |
| 0 | true | active | Made to order, ~3 wks |
| 0 | false | active | Sold out |
| any | — | archived | Retired — never making this again |
| any | — | draft | Not listed |

---

## 2. `stock_dress_images`

Unchanged from v1.

```sql
id          UUID PRIMARY KEY
dress_id    UUID NOT NULL REFERENCES stock_dresses(id) ON DELETE CASCADE
image_url   TEXT NOT NULL
is_primary  BOOLEAN NOT NULL DEFAULT false
caption     TEXT
position    INTEGER NOT NULL DEFAULT 0
uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()

CREATE UNIQUE INDEX one_primary_per_dress
  ON stock_dress_images(dress_id) WHERE is_primary = true;
```

**Outstanding (security):** `image_url` is unvalidated free text rendered
into `<img src>`. When R2 upload lands, validate with `new URL()` —
require `https:` and an exact R2 hostname match, reject rather than strip,
and mirror as a CHECK. TODO is anchored in
`src/lib/services/stockDressImagesService.js`.

---

## 3–4. `stock_dress_options` / `stock_dress_option_values`

Unchanged from v1. Client customization choices at order time
("Dupatta Style" → Plain / Painted). Not stocked, not SKU'd.

```sql
stock_dress_options
  id, dress_id FK, name, position, created_at

stock_dress_option_values
  id, option_id FK, value, price_adjustment NUMERIC(12,2) DEFAULT 0,
  position, created_at
```

`price_adjustment` exists but the UI has never written it.

### Variant or option?

**Does the finished thing exist before someone asks for it?**

- Yes, it hangs on the rack ready to sell → **variant**. Countable, gets a
  SKU and a barcode.
- No, it's made once the customer chooses → **option**. No SKU, no quantity,
  just a price adjustment and an instruction to the karigar.

Price is *not* the test — variants vary in price too, via `price_override`.

Golden Studio: size and colour are variants. Dupatta style is an option —
the same design is never hung twice with different dupattas.

Keeping them separate avoids combinatorial noise: a lehenga in 3 sizes ×
2 dupattas × 2 sleeve lengths would be 12 SKUs and 12 barcodes, 9 of which
never physically exist. As 3 variants + 2 options it is 3 countable things.

---

## 5. `stock_dress_variants`

```sql
id              UUID PRIMARY KEY
dress_id        UUID NOT NULL REFERENCES stock_dresses(id) ON DELETE CASCADE
sku             TEXT UNIQUE       -- derived by trigger from parent + axis values
barcode         TEXT UNIQUE       -- Code128; defaults to sku, manually overridable
price_override  NUMERIC(12,2)     -- null = use parent price
quantity        INTEGER NOT NULL DEFAULT 0   -- maintained ONLY by movement trigger
status          variant_status NOT NULL DEFAULT 'active'
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```

`quantity` is a cached running total. Nothing writes it except the
`stock_movements` trigger, so it cannot drift.

Barcode is Code128 over the SKU string, rendered client-side. Stored as its
own column because it must be overridable.

---

## 6. `stock_dress_variant_values`

Unchanged from v1.

```sql
id, variant_id FK, axis variant_axis, value TEXT
UNIQUE (variant_id, axis)
```

Schema has always supported 4 axes; the v1 UI only ever wrote `size`.
v2 UI should expose the full matrix.

---

## 7. `stock_borrowers` — NEW

Who is allowed to take a sample off the rack. A controlled dropdown, not
free text — "Aslam" / "aslam" / "Aslam karigar" as three people would make
"what does Aslam have right now" silently wrong.

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
name        TEXT NOT NULL
phone       TEXT
cnic        TEXT
type        borrower_type NOT NULL
note        TEXT
is_active   BOOLEAN NOT NULL DEFAULT true
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()

CONSTRAINT cnic_format CHECK (
  cnic IS NULL OR cnic ~ '^[0-9]{5}-?[0-9]{7}-?[0-9]$'
)
```

Managed from Settings. `is_active = false` removes someone from the dropdown
while keeping their history readable.

**PREREQUISITE:** do not enter real CNICs until Auth ships and RLS is
staff-scoped. Today RLS is `TO authenticated` (any Supabase user) and
`supabase/seed.sql` grants `anon` for local dev. Fine for fake data, not
for national ID numbers.

When F10 Contacts ships this likely folds into it — a dozen rows, so the
merge is trivial.

---

## 8. `stock_movements` — NEW

Append-only ledger. Every row answers: what happened to this dress, and why.

```sql
id                   UUID PRIMARY KEY DEFAULT gen_random_uuid()
variant_id           UUID NOT NULL REFERENCES stock_dress_variants(id)
                          ON DELETE RESTRICT
delta                INTEGER NOT NULL        -- +5 received, -1 sold
reason               stock_movement_reason NOT NULL

borrower_id          UUID REFERENCES stock_borrowers(id) ON DELETE RESTRICT
expected_return_at   DATE
resolves_movement_id UUID REFERENCES stock_movements(id)

note                 TEXT
created_by           UUID        -- staff FK once Auth ships
created_at           TIMESTAMPTZ NOT NULL DEFAULT now()

CONSTRAINT delta_not_zero CHECK (delta <> 0)

CONSTRAINT delta_sign_matches_reason CHECK (
  (reason IN ('received','customer_return','loan_return') AND delta > 0) OR
  (reason IN ('sold','damaged','lost','loaned_out')       AND delta < 0) OR
  (reason = 'adjustment')
)

CONSTRAINT custody_only_on_loans CHECK (
  reason = 'loaned_out'
  OR (borrower_id IS NULL AND expected_return_at IS NULL)
)

CONSTRAINT resolution_only_on_returns CHECK (
  resolves_movement_id IS NULL OR reason = 'loan_return'
)

CREATE UNIQUE INDEX one_return_per_loan
  ON stock_movements(resolves_movement_id)
  WHERE resolves_movement_id IS NOT NULL;
```

### Why it exists

A plain `quantity` counter cannot distinguish *sold forever* from *at a
photographer's studio since Tuesday*. Both read `0`. For a shop whose
designs are mostly a single sample that travels — to shoots, to karigars for
embroidery matching, to trials — that distinction is the whole point.

It also gives, for free:
- `SUM(delta) WHERE reason='damaged'` — annual write-off value
- sample age from the `received` date, which is the signal for when to
  discount an ageing design
- sell-through per design, distinguishing a fast seller from dead stock
  when both read `quantity = 2`

### Open loans

A return row points at the loan it closes, so nothing is ever edited:

```sql
SELECT * FROM stock_movements m
WHERE m.reason = 'loaned_out'
  AND NOT EXISTS (
    SELECT 1 FROM stock_movements r WHERE r.resolves_movement_id = m.id
  );
```

Add `AND m.expected_return_at < CURRENT_DATE` for an overdue list. Agreed
scope is **record only, no chasing UI** — `expected_return_at` is captured
now so that stays a query rather than a migration.

### Triggers

1. **`apply_stock_movement`** — `AFTER INSERT`, adds `delta` to
   `stock_dress_variants.quantity`.
2. **`reject_movement_mutation`** — `BEFORE UPDATE OR DELETE`, raises. A
   ledger you can edit is not a ledger; corrections are posted as an
   `adjustment` row.

### Orders seam

When Orders ships, add a nullable `order_id UUID REFERENCES orders(id)`.
Rows written before then correctly have none, so there is nothing to
backfill. Selling becomes an inserted movement, not a separate integration.

---

## Decisions taken, with reasoning

| Decision | Why |
|---|---|
| Ledger over mutable counter | Only thing here that can't be added cheaply later — history can't be reconstructed |
| Borrower registry over free text | Typos fragment identity and break "who has what" |
| Local borrower table, not waiting for F10 | A dozen rows; merge cost is an afternoon. Opposite call to the ledger, on purpose |
| No reservations in Stock | Every real case involves work + a balance + delivery → that's an order, handled in Orders |
| No locations / warehouses | One studio. Custody is a borrower, not a place |
| `profit` / `margin` not stored | Derived; stored copies go stale |
| `compare_at_price`, not `discounted_price` | Two fields answering "what does this cost" need a tiebreak rule; one field doesn't |
| Append-only ledger | Corrections as `adjustment` rows, standard bookkeeping |
| `tags` as `TEXT[]` | Autocomplete via `SELECT DISTINCT unnest(tags)`; cheaper than two tables |
| Dropped separate `type` field | `garment_type` already is it |

---

## Still open

- Courier pricing basis — weight vs volume. Fields exist either way.
- Rich-text description, if plain textarea proves insufficient.
- R2 upload + `image_url` validation.
- Auth, then tighten RLS from `authenticated` to staff-scoped and delete
  the `anon` grants in `supabase/seed.sql`.
