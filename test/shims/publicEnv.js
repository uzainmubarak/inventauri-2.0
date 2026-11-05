// Test-only stand-in for SvelteKit's `$env/static/public`, which only exists
// inside a Kit build. Aliased in vitest.config.js; never bundled into the app.
// Values come from .env.local via loadEnv — i.e. the local Docker stack.
export const PUBLIC_SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
export const PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
