<script>
	import { Input } from "$lib/ui/input";
	import { Select } from "$lib/ui/select";
	import SearchIcon from "@lucide/svelte/icons/search";
	import ListIcon from "@lucide/svelte/icons/list";
	import LayoutGridIcon from "@lucide/svelte/icons/layout-grid";

	/**
	 * Status tabs plus the search and filter row that sit at the top of the
	 * stock card. `counts` is how many dresses each tab holds, `view` is
	 * "table" or "gallery".
	 * @type {{
	 *   search: string,
	 *   category: string,
	 *   subcategory: string,
	 *   sizeType: string,
	 *   status: string,
	 *   counts: Record<string, number>,
	 *   view: string,
	 *   onChange: (filters: { search: string, category: string, subcategory: string, sizeType: string, status: string }) => void,
	 *   onViewChange: (view: string) => void
	 * }}
	 */
	let { search, category, subcategory, sizeType, status, counts, view, onChange, onViewChange } = $props();

	const CATEGORIES = [
		{ value: "", label: "All categories" },
		{ value: "party_wear", label: "Party wear" },
		{ value: "formals", label: "Formals" },
		{ value: "bridal", label: "Bridal" },
		{ value: "nikkah_wear", label: "Nikkah wear" },
	];

	const SUBCATEGORIES = [
		{ value: "", label: "All bridal" },
		{ value: "mehendi", label: "Mehendi" },
		{ value: "barat", label: "Barat" },
		{ value: "walima", label: "Walima" },
	];

	const SIZE_TYPES = [
		{ value: "", label: "All sizing" },
		{ value: "standard", label: "Standard" },
		{ value: "custom", label: "Custom" },
	];

	// product_status in schema v2. The empty value means "Active", which is the
	// everyday view; drafts and archived designs are one tab away.
	const TABS = [
		{ value: "", label: "Active" },
		{ value: "draft", label: "Drafts" },
		{ value: "archived", label: "Archived" },
		{ value: "all", label: "All" },
	];

	/** @param {Partial<{ search: string, category: string, subcategory: string, sizeType: string, status: string }>} patch */
	function emit(patch) {
		onChange({ search, category, subcategory, sizeType, status, ...patch });
	}
</script>

<div class="flex gap-6 overflow-x-auto border-b px-4" role="tablist" aria-label="Status">
	{#each TABS as tab (tab.value)}
		<button
			type="button"
			role="tab"
			aria-selected={status === tab.value}
			class="-mb-px flex h-12 items-center gap-2 border-b-2 text-sm whitespace-nowrap {status === tab.value
				? 'border-primary font-semibold'
				: 'text-muted-foreground border-transparent font-medium'}"
			onclick={() => emit({ status: tab.value })}
		>
			{tab.label}
			<span class="text-muted-foreground font-mono text-xs">{counts[tab.value === "" ? "active" : tab.value] ?? 0}</span>
		</button>
	{/each}
</div>

<div class="border-border-light flex flex-wrap items-center gap-3 border-b p-4">
	<div class="relative w-full sm:w-80">
		<SearchIcon class="text-text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
		<Input
			type="search"
			aria-label="Search dresses"
			placeholder="Search name, SKU, type or tag"
			class="pl-9"
			value={search}
			oninput={(e) => emit({ search: e.currentTarget.value })}
		/>
	</div>

	<div class="w-44">
		<Select
			aria-label="Category"
			value={category}
			onchange={(e) => emit({ category: e.currentTarget.value, subcategory: "" })}
		>
			{#each CATEGORIES as opt (opt.value)}<option value={opt.value}>{opt.label}</option>{/each}
		</Select>
	</div>

	{#if category === "bridal"}
		<div class="w-40">
			<Select aria-label="Bridal occasion" value={subcategory} onchange={(e) => emit({ subcategory: e.currentTarget.value })}>
				{#each SUBCATEGORIES as opt (opt.value)}<option value={opt.value}>{opt.label}</option>{/each}
			</Select>
		</div>
	{/if}

	<div class="w-36">
		<Select aria-label="Sizing" value={sizeType} onchange={(e) => emit({ sizeType: e.currentTarget.value })}>
			{#each SIZE_TYPES as opt (opt.value)}<option value={opt.value}>{opt.label}</option>{/each}
		</Select>
	</div>

	<div class="flex-1"></div>

	<div class="border-border flex gap-0.5 rounded-lg border p-0.5">
		<button
			type="button"
			aria-label="Table view"
			aria-pressed={view === "table"}
			class="flex size-[30px] items-center justify-center rounded-md {view === 'table' ? 'bg-secondary text-foreground' : 'text-muted-foreground'}"
			onclick={() => onViewChange("table")}
		>
			<ListIcon class="size-4" />
		</button>
		<button
			type="button"
			aria-label="Gallery view"
			aria-pressed={view === "gallery"}
			class="flex size-[30px] items-center justify-center rounded-md {view === 'gallery' ? 'bg-secondary text-foreground' : 'text-muted-foreground'}"
			onclick={() => onViewChange("gallery")}
		>
			<LayoutGridIcon class="size-4" />
		</button>
	</div>
</div>
