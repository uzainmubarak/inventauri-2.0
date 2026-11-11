<script>
	import ImageIcon from "@lucide/svelte/icons/image";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import { getStockDressById } from "$lib/services/stockDressesService";
	import { listMovementsForDress } from "$lib/services/stockMovementsService";
	import { summariseDress } from "$lib/products/dressSummary";
	import { computeProfit, computeMargin } from "$lib/products/pricing";

	/**
	 * Read-only view of one dress, shared by the list drawer and the dress page.
	 * Nothing here edits: photos, price and stock are changed from the edit form
	 * or a variant's own page, and stock only moves through the ledger.
	 * Props: `dressId`, and `summary` (bindable: the dress's availability summary
	 * once loaded, for a header badge).
	 * @type {{ dressId: string, summary?: any }}
	 */
	let { dressId, summary = $bindable(null) } = $props();

	/** @type {any} */
	let fullDress = $state(null);
	/** @type {any[]} */
	let movements = $state([]);
	let loading = $state(true);
	/** @type {string | null} */
	let error = $state(null);
	let photoIndex = $state(0);

	const photos = $derived(
		(fullDress?.stock_dress_images ?? []).filter(/** @param {any} i */ (i) => !i.variant_id),
	);
	const variants = $derived(
		(fullDress?.stock_dress_variants ?? []).filter(/** @param {any} v */ (v) => v.status !== "archived"),
	);
	const profit = $derived(fullDress ? computeProfit(fullDress.price, fullDress.cost) : null);
	const margin = $derived(fullDress ? computeMargin(fullDress.price, fullDress.cost) : null);

	$effect(() => {
		load(dressId);
	});

	/** @param {string} id */
	async function load(id) {
		loading = true;
		error = null;
		const [dressResult, movementResult] = await Promise.all([
			getStockDressById(id),
			listMovementsForDress(id),
		]);
		loading = false;
		if (dressResult.error) {
			error = dressResult.error;
			return;
		}
		fullDress = dressResult.data;
		summary = summariseDress(fullDress);
		movements = movementResult.data ?? [];
		photoIndex = 0;
	}

	/** @param {string} value */
	const label = (value) => value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
	/** @param {number | string} n */
	const money = (n) => Number(n).toLocaleString();

	/** @param {any} variant */
	const variantName = (variant) =>
		(variant.stock_dress_variant_values ?? []).map(/** @param {any} v */ (v) => v.value).join(" · ") || "Custom";

	/** @param {string | null} id */
	function movementVariant(id) {
		const match = variants.find(/** @param {any} v */ (v) => v.id === id);
		return match ? variantName(match) : "";
	}

	/** @param {string} iso */
	const shortDate = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

	/** @param {number} delta */
	const signed = (delta) => (delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`);

	const recentMovements = $derived([...movements].reverse().slice(0, 8));
</script>

<div class="flex flex-col gap-8">
{#if loading}
	<p class="text-muted-foreground text-sm">Loading…</p>
{:else if error}
	<p class="text-destructive text-sm">Error: {error}</p>
{:else if fullDress && summary}
	<div class="flex flex-col gap-3">
		<div class="bg-muted text-text-muted flex h-60 items-center justify-center overflow-hidden rounded-xl">
			{#if photos[photoIndex]}
				<img src={photos[photoIndex].image_url} alt={fullDress.name} class="size-full object-cover" />
			{:else}
				<ImageIcon class="size-8" />
			{/if}
		</div>
		{#if photos.length > 1}
			<div class="flex gap-2">
				{#each photos as photo, i (photo.id)}
					<button
						type="button"
						aria-label="Show photo {i + 1}"
						aria-pressed={i === photoIndex}
						class="bg-muted size-16 overflow-hidden rounded-lg {i === photoIndex ? 'ring-primary ring-2' : ''}"
						onclick={() => (photoIndex = i)}
					>
						<img src={photo.image_url} alt="" class="size-full object-cover" />
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<div class="grid grid-cols-3 gap-3">
		<div class="bg-background border-border-light flex flex-col gap-1 rounded-xl border px-4 py-3.5">
			<span class="text-muted-foreground text-xs">Price</span>
			<span class="font-mono text-base font-medium">PKR {money(fullDress.price)}</span>
			{#if fullDress.compare_at_price}
				<span class="text-muted-foreground font-mono text-xs line-through">PKR {money(fullDress.compare_at_price)}</span>
			{/if}
		</div>
		<div class="bg-background border-border-light flex flex-col gap-1 rounded-xl border px-4 py-3.5">
			<span class="text-muted-foreground text-xs">Cost</span>
			<span class="font-mono text-base font-medium">{fullDress.cost == null ? "–" : `PKR ${money(fullDress.cost)}`}</span>
		</div>
		<div
			class="flex flex-col gap-1 rounded-xl px-4 py-3.5 {profit == null
				? 'bg-background border-border-light border'
				: profit >= 0
					? 'bg-green-dim text-green'
					: 'bg-destructive/10 text-destructive'}"
		>
			<span class="text-xs {profit == null ? 'text-muted-foreground' : ''}">
				Profit{margin == null ? "" : ` · ${(margin * 100).toFixed(1)}%`}
			</span>
			<span class="font-mono text-base font-medium">{profit == null ? "–" : `PKR ${money(profit)}`}</span>
		</div>
	</div>

	{#if fullDress.description}
		<section class="flex flex-col gap-2.5">
			<h2 class="font-serif text-xl font-medium">Description</h2>
			<p class="text-sm leading-relaxed">{fullDress.description}</p>
		</section>
	{/if}

	<section class="flex flex-col gap-3">
		<h2 class="font-serif text-xl font-medium">Inventory</h2>
		<div class="border-border divide-border-light flex flex-col divide-y overflow-hidden rounded-xl border">
			<div class="flex items-center justify-between gap-4 px-4 py-3">
				<span class="text-muted-foreground text-[13px]">On the rack</span>
				{#if fullDress.track_quantity}
					<span class="flex flex-col items-end gap-0.5">
						<span class="font-mono text-sm font-medium">{summary.quantity}</span>
						<span class="text-muted-foreground text-xs">
							{summary.variantCount > 0 ? "Sum of the variants" : "Held on the dress"}
						</span>
					</span>
				{:else}
					<span class="text-sm font-medium">Not tracked</span>
				{/if}
			</div>
			<div class="flex items-center justify-between gap-4 px-4 py-3">
				<span class="text-muted-foreground text-[13px]">Make to order</span>
				<span class="text-sm font-medium">{fullDress.made_to_order ? "Available" : "Not offered"}</span>
			</div>
		</div>
	</section>

	{#if fullDress.stock_dress_options?.length}
		<section class="flex flex-col gap-3">
			<h2 class="font-serif text-xl font-medium">Options</h2>
			{#each fullDress.stock_dress_options as option (option.id)}
				<div class="flex items-center gap-3">
					<span class="text-muted-foreground w-24 shrink-0 text-[13px]">{option.name}</span>
					<div class="flex flex-wrap gap-2">
						{#each option.stock_dress_option_values ?? [] as v (v.id)}
							<span class="bg-secondary flex h-8 items-center gap-2 rounded-full pr-3 text-[13px] font-medium {v.image_url ? 'pl-1' : 'pl-3'}">
								{#if v.image_url}<img src={v.image_url} alt="" class="ring-border size-6 rounded-full object-cover ring-1" />{/if}
								{v.value}{#if Number(v.price_adjustment)}<span class="text-muted-foreground font-mono text-xs">+ PKR {money(v.price_adjustment)}</span>{/if}
							</span>
						{/each}
					</div>
				</div>
			{/each}
		</section>
	{/if}

	<section class="flex flex-col gap-3">
		<div class="flex items-center justify-between">
			<h2 class="font-serif text-xl font-medium">Variants</h2>
			{#if fullDress.track_quantity && variants.length}
				<span class="text-muted-foreground text-[13px]">{summary.quantity} in stock</span>
			{/if}
		</div>
		{#if variants.length === 0}
			<p class="text-muted-foreground text-sm">No variants. This dress holds its own count.</p>
		{:else}
			<div class="border-border divide-border-light flex flex-col divide-y overflow-hidden rounded-xl border">
				{#each variants as variant (variant.id)}
					<a
						href="/products/{dressId}/variants/{variant.id}"
						class="hover:bg-background grid h-14 grid-cols-[1fr_auto_auto] items-center gap-4 px-4"
					>
						<span class="flex min-w-0 flex-col gap-0.5">
							<span class="truncate text-sm font-medium">{variantName(variant)}</span>
							<span class="text-muted-foreground font-mono text-xs">{variant.sku ?? "No SKU yet"}</span>
						</span>
						<span class="font-mono text-[13px]">{fullDress.track_quantity ? variant.quantity : "–"}</span>
						<ChevronRightIcon class="text-text-muted size-3.5" />
					</a>
				{/each}
			</div>
			<p class="text-muted-foreground text-[13px]">Open a variant to see its photos, price and stock.</p>
		{/if}
	</section>

	<section class="flex flex-col gap-3">
		<div class="flex flex-col gap-1">
			<h2 class="font-serif text-xl font-medium">Movements</h2>
			<p class="text-muted-foreground text-[13px]">Every change is a new entry. Entries are never edited.</p>
		</div>
		{#if recentMovements.length === 0}
			<p class="text-muted-foreground text-sm">No stock movements yet.</p>
		{:else}
			<div class="divide-border-light flex flex-col divide-y">
				{#each recentMovements as m (m.id)}
					<div class="flex items-center gap-3 py-3">
						<span class="w-11 font-mono text-[13px] font-medium {m.delta > 0 ? 'text-green' : 'text-destructive'}">{signed(m.delta)}</span>
						<span class="flex flex-1 flex-col gap-0.5">
							<span class="text-sm font-medium">{label(m.reason)}</span>
							{#if movementVariant(m.variant_id) || m.note}
								<span class="text-muted-foreground text-xs">{[movementVariant(m.variant_id), m.note].filter(Boolean).join(", ")}</span>
							{/if}
						</span>
						<span class="text-muted-foreground text-xs">{shortDate(m.created_at)}</span>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	{#if fullDress.tags?.length}
		<section class="flex flex-col gap-2.5">
			<h2 class="font-serif text-xl font-medium">Tags</h2>
			<div class="flex flex-wrap gap-2">
				{#each fullDress.tags as tag (tag)}
					<span class="border-border rounded-full border px-2.5 py-1 text-xs font-medium">{tag}</span>
				{/each}
			</div>
		</section>
	{/if}

	{#if fullDress.notes}
		<section class="flex flex-col gap-2.5">
			<h2 class="font-serif text-xl font-medium">Internal notes</h2>
			<p class="text-muted-foreground text-sm leading-relaxed">{fullDress.notes}</p>
			<p class="text-muted-foreground text-xs">Staff only, never shown to a client.</p>
		</section>
	{/if}
{/if}
</div>
