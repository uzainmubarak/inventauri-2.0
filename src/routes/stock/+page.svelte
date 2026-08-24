<script>
	import { listStockDresses } from "$lib/services/stockDressesService";
	import StockDressGrid from "./components/StockDressGrid.svelte";
	import StockDressFilters from "./components/StockDressFilters.svelte";
	import StockDressDrawer from "./components/StockDressDrawer.svelte";

	let allDresses = $state([]);
	let loading = $state(true);
	let error = $state(null);

	let filters = $state({ search: "", category: "", subcategory: "", sizeType: "", status: "" });

	let selectedDress = $state(null);
	let drawerOpen = $state(false);

	async function load() {
		loading = true;
		error = null;
		const { data, error: fetchError } = await listStockDresses();
		if (fetchError) {
			error = fetchError;
		} else {
			allDresses = data ?? [];
		}
		loading = false;
	}

	$effect(() => {
		load();
	});

	const filteredDresses = $derived.by(() => {
		return allDresses.filter((dress) => {
			// Drafts are hidden from the default view (no status filter
			// selected) — they're incomplete by design and would clutter the
			// catalog. Still reachable by explicitly filtering for status=draft.
			if (!filters.status && dress.status === "draft") return false;
			if (filters.search) {
				const q = filters.search.toLowerCase();
				const matches =
					dress.name.toLowerCase().includes(q) || dress.garment_type.toLowerCase().includes(q);
				if (!matches) return false;
			}
			if (filters.category && dress.category !== filters.category) return false;
			if (filters.subcategory && dress.subcategory !== filters.subcategory) return false;
			if (filters.status && dress.status !== filters.status) return false;
			if (filters.sizeType) {
				const variants = dress.stock_dress_variants ?? [];
				const hasSizeType = variants.some((v) => {
					const hasSize = v.stock_dress_variant_values?.some((av) => av.axis === "size");
					return filters.sizeType === "standard" ? hasSize : !hasSize;
				});
				if (variants.length > 0 && !hasSizeType) return false;
			}
			return true;
		});
	});

	function openDrawer(dress) {
		selectedDress = dress;
		drawerOpen = true;
	}

	async function closeDrawer() {
		drawerOpen = false;
		await load();
	}
</script>

<div class="topbar">
	<div class="breadcrumb"><span>Stock Dresses</span></div>
</div>

<div class="content-area">
	<div class="scroll-area">
		<div class="page-header">
			<div>
				<div class="page-title">Stock Dresses</div>
				<div class="page-meta">Finished ready-made dresses available for sale</div>
			</div>
			<a href="/stock/new" class="btn-gold">+ Add Stock Dress</a>
		</div>

		<StockDressFilters
			search={filters.search}
			category={filters.category}
			subcategory={filters.subcategory}
			sizeType={filters.sizeType}
			status={filters.status}
			onChange={(newFilters) => (filters = newFilters)}
		/>

		{#if loading}
			<p>Loading…</p>
		{:else if error}
			<p class="error-text">Error: {error}</p>
		{:else}
			<StockDressGrid dresses={filteredDresses} onSelect={openDrawer} />
		{/if}
	</div>
</div>

{#if drawerOpen}
	<StockDressDrawer dress={selectedDress} onClose={closeDrawer} onSaved={closeDrawer} />
{/if}

<style>
	.topbar {
		background: var(--bg);
		border-bottom: 1px solid var(--border);
		padding: 0 28px;
		height: 56px;
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.breadcrumb {
		font-size: 12px;
		color: var(--text-muted);
	}

	.breadcrumb span {
		color: var(--text);
		font-weight: 500;
	}

	.content-area {
		flex: 1;
		overflow: hidden;
	}

	.scroll-area {
		height: 100%;
		overflow-y: auto;
		padding: 24px 28px;
	}

	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 22px;
	}

	.page-title {
		font-family: 'Playfair Display', serif;
		font-size: 34px;
		font-weight: 500;
		letter-spacing: -0.01em;
		line-height: 1;
	}

	.page-meta {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 6px;
	}

	.btn-gold {
		display: flex;
		align-items: center;
		gap: 6px;
		background: var(--gold);
		border: none;
		border-radius: 8px;
		padding: 7px 14px;
		font-size: 12px;
		font-weight: 500;
		color: #fff;
		cursor: pointer;
		font-family: 'DM Sans', sans-serif;
		box-shadow: 0 2px 8px rgba(201, 169, 97, 0.3);
		transition: all 0.15s;
		text-decoration: none;
	}

	.btn-gold:hover {
		background: #b8953a;
	}

	.error-text {
		color: var(--error);
		font-size: 13px;
	}

	@media (max-width: 767px) {
		.scroll-area {
			padding: 16px;
			padding-bottom: 72px; /* clear the mobile tab bar */
		}
	}
</style>
