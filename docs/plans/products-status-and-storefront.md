# Plan: product status rules and the web store's out-of-stock behaviour

Status: draft for design. Owner of decisions: the user. Scope: the Products module (formerly Stock) and the web store that replaces Shopify.

## 1. Status rules (POS)

Two stored statuses are chosen by the user. Nothing else is stored as a status.

| Status | Set by | Where it shows | Rules |
|---|---|---|---|
| **Active** | "Create dress" and edits | Default list | Price must be above 0. Stock can be zero. |
| **Draft** | "Save draft" | Hidden from the default list | Price is not checked. |
| **Archived** | Archive action | Hidden from the default list | Kept even if stock is left. Never hard-deleted. |

- A new dress saved with "Create dress" is **active**. "Save draft" is the only way to get a draft.
- Variant status is **active** or **archived**. Removing a saved variant archives it, and its quantity stops counting toward the dress total.

### Out-of-stock appearance

Open. There is no stored label for stock. Two options are on the table:

1. **Quantity only (recommended):** the POS card shows the stock number. No "sold out" or "made to order" label. Matches Shopify.
2. **Derived label:** the card shows a label worked out from stock. Requires a rule for each case, and one case has no good answer yet: track quantity off with make to order off shows "Sold out" even with pieces on the rack.

Make to order becomes a setting on the dress (equivalent to Shopify's "Sell when out of stock"), not a stock state. Its effect on the web store is in section 2.

## 2. Web store: out-of-stock behaviour

Each product chooses what happens when it can't be bought:

| Setting | Shopper sees |
|---|---|
| **Hide** | The product is not listed. |
| **Show as sold out** | The product is listed with a "Notify me when available" button. |
| **Take orders** | The product is listed with a "Order now" button and the lead time (for example 2 to 4 weeks). |

Rules:
- The setting is per product, with a default chosen by the user.
- "Notify me" stores the shopper's details against the variant they want. It does not take payment.
- A **received** movement in the stock ledger on that variant triggers the notifications for that variant, once each.
- Notifications are sent after the stock is on the rack, never before, so a shopper is not told about a piece that isn't ready.

### Waitlist data

A new table, `stock_waitlist` (name to be confirmed):

- variant reference, dress reference
- name, phone or email (at least one)
- consent: the shopper ticked a line saying they agree to be contacted about this item
- created at, notified at (null until sent)

Phone numbers are personal data. They are only readable by staff, and are removed on request.

### Open questions

1. **Channel:** WhatsApp, SMS, email, or a mix. WhatsApp is the likely first choice; it has a cost per message.
2. **Consent wording:** exact text, and whether the box is required.
3. **Removing a notify request:** can a shopper cancel, and how?
4. **Waitlist when a variant is archived:** tell the shopper, or drop the request silently?
5. **Lead time:** where it is entered (the dress form, or the order side).

## 3. Not in this plan

- Payment on the web store.
- Order handling (covered by the Orders module).
- The sales channel itself: the store's pages and design are a separate plan.
