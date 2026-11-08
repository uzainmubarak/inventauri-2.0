<script>
	import { listStockDresses, archiveStockDress } from "$lib/services/stockDressesService";
	import { summariseDress } from "$lib/stock/dressSummary";
	import { Button } from "$lib/ui/button";
	import * as Dialog from "$lib/ui/dialog";
	import { EmptyState } from "$lib/ui/empty-state";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import PackageIcon from "@lucide/svelte/icons/package";
	import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import StockDressGrid from "./components/StockDressGrid.svelte";
	import StockDressFilters from "./components/StockDressFilters.svelte";
	import StockDressDrawer from "./components/StockDressDrawer.svelte";
	import StockDressTable from "./components/StockDressTable.svelte";

	const PAGE_SIZE = 25;

	/** @type {any[]} */
	let allDresses = $state([]);
	let loading = $state(true);
	/** @type {string | null} */
	let error = $state(null);

	let filters = $state({ search: "", category: "", subcategory: "", sizeType: "", status: "" });
	// The table needs room; on a phone the card gallery reads better.
	let view = $state(window.matchMedia("(max-width: 767px)").matches ? "gallery" : "table");
	/** @type {{ key: string, dir: "asc" | "desc" } | null} */
	let sort = $state(null);
	let page = $state(1);
	/** @type {string[]} */
	let selected = $state([]);

	/** @type {any} */
	let selectedDress = $state(null);
	let drawerOpen = $state(false);

	/** @type {any[]} */
	let archiveTargets = $state([]);
	let archiving = $state(false);
	/** @type {string | null} */
	let archiveError = $state(null);

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

	const counts = $derived({
		active: allDresses.filter((d) => d.status === "active").length,
		draft: allDresses.filter((d) => d.status === "draft").length,
		archived: allDresses.filter((d) => d.status === "archived").length,
		all: allDresses.length,
	});

	const filteredDresses = $derived.by(() => {
		return allDresses.filter((dress) => {
			// The status filter's empty value means "Active" — drafts are
			// incomplete and archived designs are retired, so neither belongs
			// in the everyday view. "All" ('all') opts out of the filter.
			if (filters.status === "" && dress.status !== "active") return false;
			if (filters.status && filters.status !== "all" && dress.status !== filters.status) {
				return false;
			}
			if (filters.search) {
				const q = filters.search.toLowerCase();
				const matches =
					dress.name.toLowerCase().includes(q) ||
					dress.garment_type.toLowerCase().includes(q) ||
					(dress.sku ?? "").toLowerCase().includes(q) ||
					(dress.tags ?? []).some(/** @param {string} t */ (t) => t.toLowerCase().includes(q));
				if (!matches) return false;
			}
			if (filters.category && dress.category !== filters.category) return false;
			if (filters.subcategory && dress.subcategory !== filters.subcategory) return false;
			if (filters.sizeType) {
				const variants = dress.stock_dress_variants ?? [];
				const hasSizeType = variants.some(/** @param {any} v */ (v) => {
					const hasSize = v.stock_dress_variant_values?.some(/** @param {any} av */ (av) => av.axis === "size");
					return filters.sizeType === "standard" ? hasSize : !hasSize;
				});
				if (variants.length > 0 && !hasSizeType) return false;
			}
			return true;
		});
	});

	const rows = $derived(filteredDresses.map((dress) => ({ dress, ...summariseDress(dress) })));

	const sortedRows = $derived.by(() => {
		if (!sort) return rows;
		const { key, dir } = sort;
		const sign = dir === "asc" ? 1 : -1;
		return [...rows].sort((a, b) =>
			key === "name"
				? sign * a.dress.name.localeCompare(b.dress.name)
				: sign * (key === "quantity" ? a.quantity - b.quantity : a.price - b.price),
		);
	});

	const pageCount = $derived(Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE)));
	const pageRows = $derived(sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));

	// Back to the first page whenever the list underneath changes shape.
	$effect(() => {
		filters;
		sort;
		page = 1;
	});

	// Only what is still in the filtered list counts as selected.
	const selectedVisible = $derived(
		selected.filter((id) => filteredDresses.some((d) => d.id === id)),
	);

	/** @param {string} key */
	function onSort(key) {
		sort =
			sort?.key !== key
				? { key, dir: "asc" }
				: sort.dir === "asc"
					? { key, dir: "desc" }
					: null;
	}

	/** @param {any} dress */
	function openDrawer(dress) {
		selectedDress = dress;
		drawerOpen = true;
	}

	async function confirmArchive() {
		archiving = true;
		archiveError = null;
		for (const dress of archiveTargets) {
			const { error: archiveFailed } = await archiveStockDress(dress.id);
			if (archiveFailed) {
				archiveError = `${dress.name}: ${archiveFailed}`;
				break;
			}
		}
		archiving = false;
		if (!archiveError) {
			archiveTargets = [];
			selected = [];
			await load();
		}
	}

	function archiveSelected() {
		archiveTargets = allDresses.filter((d) => selectedVisible.includes(d.id) && d.status !== "archived");
	}
</script>

<div class="flex-1 overflow-y-auto px-4 py-6 pb-20 md:px-12 md:py-10 md:pb-10">
	<div class="mb-7 flex flex-wrap items-end justify-between gap-4">
		<div class="flex flex-col gap-1.5">
			<h1 class="font-serif text-4xl leading-tight font-semibold">Stock</h1>
			<p class="text-muted-foreground text-sm">Designs ready on the rack or made to order.</p>
		</div>
		<Button href="/stock/new" size="lg"><PlusIcon />Add dress</Button>
	</div>

	<div class="bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1">
		<StockDressFilters
			search={filters.search}
			category={filters.category}
			subcategory={filters.subcategory}
			sizeType={filters.sizeType}
			status={filters.status}
			{counts}
			{view}
			onChange={(newFilters) => (filters = newFilters)}
			onViewChange={(next) => (view = next)}
		/>

		{#if loading}
			<div class="flex flex-col" aria-busy="true" aria-label="Loading dresses">
				{#each [0, 1, 2, 3, 4] as n (n)}
					<div class="border-border-light flex h-[60px] items-center gap-3 border-b px-6">
						<div class="bg-[var(--bg3)] size-11 animate-pulse rounded-lg"></div>
						<div class="flex flex-col gap-1.5">
							<div class="bg-[var(--bg3)] h-2.5 w-40 animate-pulse rounded"></div>
							<div class="bg-secondary h-2 w-24 animate-pulse rounded"></div>
						</div>
					</div>
				{/each}
			</div>
		{:else if error}
			<p class="text-destructive p-6 text-sm">Error: {error}</p>
		{:else if allDresses.length === 0}
			<EmptyState title="No dresses yet" description="Add your first dress and it will show up here.">
				{#snippet icon()}<PackageIcon class="size-5" />{/snippet}
				<Button href="/stock/new"><PlusIcon />Add dress</Button>
			</EmptyState>
		{:else if filteredDresses.length === 0}
			<EmptyState title="No dresses match" description="Try a different search, or clear a filter." />
		{:else if view === "gallery"}
			<div class="p-4"><StockDressGrid dresses={filteredDresses} onSelect={openDrawer} /></div>
		{:else}
			<StockDressTable
				rows={pageRows}
				bind:selected
				{sort}
				{onSort}
				onOpen={openDrawer}
				onArchive={(dress) => (archiveTargets = [dress])}
			/>
			<div class="border-border-light bg-background flex items-center justify-between border-t px-4 py-3">
				<span class="text-muted-foreground text-[13px]">
					Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, sortedRows.length)} of {sortedRows.length}
				</span>
				{#if pageCount > 1}
					<div class="flex gap-2">
						<Button variant="outline" size="icon" aria-label="Previous page" disabled={page === 1} onclick={() => (page -= 1)}>
							<ChevronLeftIcon />
						</Button>
						<Button variant="outline" size="icon" aria-label="Next page" disabled={page === pageCount} onclick={() => (page += 1)}>
							<ChevronRightIcon />
						</Button>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	{#if selectedVisible.length > 0 && view === "table"}
		<div
			class="mt-4 flex w-fit max-w-full items-center gap-3 rounded-xl bg-[var(--sidebar-bg)] py-2.5 pr-3 pl-5 text-[var(--sidebar-text)] shadow-lg"
		>
			<span class="text-sm font-medium text-white">{selectedVisible.length} selected</span>
			<span class="h-5 w-px bg-white/10"></span>
			<Button class="bg-destructive text-white hover:bg-destructive/90" onclick={archiveSelected}>Archive</Button>
			<Button variant="ghost" class="text-[var(--sidebar-text)] hover:bg-white/10 hover:text-white" onclick={() => (selected = [])}>
				Clear
			</Button>
		</div>
	{/if}
</div>

{#if drawerOpen}
	<StockDressDrawer dress={selectedDress} onClose={() => (drawerOpen = false)} />
{/if}

<Dialog.Root
	open={archiveTargets.length > 0}
	onOpenChange={(open) => {
		if (!open && !archiving) {
			archiveTargets = [];
			archiveError = null;
		}
	}}
>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>
				Archive {archiveTargets.length === 1 ? archiveTargets[0].name : `${archiveTargets.length} dresses`}?
			</Dialog.Title>
			<Dialog.Description>
				They leave the active list and can still be found under Archived. Stock history is kept.
			</Dialog.Description>
		</Dialog.Header>
		{#if archiveError}
			<p class="text-destructive text-sm">Error: {archiveError}</p>
		{/if}
		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}<Button variant="outline" {...props}>Cancel</Button>{/snippet}
			</Dialog.Close>
			<Button class="bg-destructive text-white hover:bg-destructive/90" disabled={archiving} onclick={confirmArchive}>
				{archiving ? "Archiving…" : "Archive"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
