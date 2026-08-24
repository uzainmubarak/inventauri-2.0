<script>
    import { listStockDresses, createStockDress } from "$lib/services/stockDressesService";

    let dresses = $state([]);
    let loading = $state(true);
    let error = $state(null);
    let seeding = $state(false);

    async function load() {
        loading = true;
        error = null;

        const { data, error: fetchError } = await listStockDresses();

        if (fetchError) {
            error = fetchError;
        } else {
            dresses = data ?? [];
        }
        loading = false;
    }

    $effect(() => {
        let cancelled = false;
        (async () => {
            loading = true;
            error = null;
            const { data, error: fetchError } = await listStockDresses();
            if (cancelled) return;
            if (fetchError) {
                error = fetchError;
            } else {
                dresses = data ?? [];
            }
            loading = false;
        })();
        return () => {
            cancelled = true;
        };
    });

    async function seedTestDress() {
        seeding = true;
        const { error: createError } = await createStockDress({
            name: "Farshi Lehenga Maroon (local test)",
            garment_type: "Farshi Lehenga",
            category: "bridal",
            subcategory: "barat",
            base_price: 45000,
        });
        seeding = false;
        if (createError) {
            error = createError;
            return;
        }
        await load();
    }
</script>

<div class="page">
    <h1>Stock Dresses (local Supabase check)</h1>
    <p class="hint">
        Calls <code>listStockDresses()</code> from
        <code>src/lib/services/stockDressesService.js</code> against
        whatever <code>PUBLIC_SUPABASE_URL</code> currently points to — right
        now that should be your local Docker stack
        (<code>http://127.0.0.1:54321</code>), not production.
    </p>

    <button onclick={seedTestDress} disabled={seeding}>
        {seeding ? "Creating…" : "Insert a test dress"}
    </button>

    {#if loading}
        <p>Loading…</p>
    {:else if error}
        <p class="error">Error: {error}</p>
    {:else if dresses.length === 0}
        <p>No stock dresses yet — click the button above to create one.</p>
    {:else}
        <ul>
            {#each dresses as dress}
                <li>
                    <strong>{dress.sku}</strong> — {dress.name}
                    ({dress.category}{dress.subcategory ? ` / ${dress.subcategory}` : ""})
                    — PKR {dress.base_price}
                </li>
            {/each}
        </ul>
        <p>{dresses.length} row(s) returned.</p>
    {/if}
</div>

<style>
    .page {
        padding: 2rem;
    }
    .hint {
        color: #666;
        max-width: 60ch;
    }
    .error {
        color: #c0392b;
    }
    button {
        margin: 1rem 0;
    }
</style>
