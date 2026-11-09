# Inventauri — project rules

Production-management app for Golden Studio (custom/bridal garment workshop).
Tauri 2 + SvelteKit 2 (Svelte 5 runes), static SPA (`ssr = false`), Supabase backend.

## Commands
- Package manager: `bun` only.
- Dev: `bun run dev` (port 1420). Tests: `bun run test`. Types: `bun run check`.
- Integration tests hit local Supabase only (`supabase start`).

## Layout
- One folder per module, code and test together, with an `index.js` entry:
  `src/lib/products/availability/index.js` + `availability.test.js`.
- Services: one folder per table in `src/lib/services/`. Every function returns `{ data, error }`.
- UI primitives: `src/lib/ui/<component>/` (shadcn-svelte). Feature screens under `src/routes/`.

## Who owns what
- **Design chat:** `src/lib/ui/*` components and their styling. Pushes design changes as code.
- **Code chat:** services, `src/lib/products/*`, schema, routes, logic.
- Both follow the same folder and naming rules above.

## Styling
- Tailwind v4 + shadcn-svelte. Colours and fonts come from the Golden Studio tokens in `src/app.css`. Never hard-code hex values in components.
- Global resets go in `@layer base`. Unlayered CSS beats Tailwind layers.

## Data rules
- The stock ledger (`stock_movements`) is append-only. Quantity changes go through movements, never direct writes.
- SKUs are an input. The frontend generates them from `stock_settings` (`src/lib/products/sku`) or the user types them. The database never builds a SKU. See `docs/settings.md`.
- Production RLS is `TO authenticated`. The `supabase/seed.sql` anon policies are local-only and must be removed when Auth ships.

## Git
- Commit small, with clear messages. Committing to `main` is fine.
- Do not push without asking.
- Commit trailer: `Co-Authored-By: Claude <noreply@anthropic.com>`.

## Replies
- Keep answers short and concise.
