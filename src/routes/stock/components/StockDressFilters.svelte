<script>
	/**
	 * @type {{
	 *   search: string,
	 *   category: string,
	 *   subcategory: string,
	 *   sizeType: string,
	 *   status: string,
	 *   onChange: (filters: { search: string, category: string, subcategory: string, sizeType: string, status: string }) => void
	 * }}
	 */
	let { search, category, subcategory, sizeType, status, onChange } = $props();

	const CATEGORIES = [
		{ value: "", label: "All Categories" },
		{ value: "party_wear", label: "Party Wear" },
		{ value: "formals", label: "Formals" },
		{ value: "bridal", label: "Bridal" },
		{ value: "nikkah_wear", label: "Nikkah Wear" },
	];

	const SUBCATEGORIES = [
		{ value: "", label: "All" },
		{ value: "mehendi", label: "Mehendi" },
		{ value: "barat", label: "Barat" },
		{ value: "walima", label: "Walima" },
	];

	const SIZE_TYPES = [
		{ value: "", label: "All Sizes" },
		{ value: "standard", label: "Standard" },
		{ value: "custom", label: "Custom" },
	];

	// product_status in schema v2. 'available'/'reserved'/'sold' are gone —
	// those described a physical garment, not a design, and are now answered
	// by quantity and the movement ledger.
	const STATUSES = [
		{ value: "", label: "Active" },
		{ value: "draft", label: "Drafts" },
		{ value: "archived", label: "Archived" },
		{ value: "all", label: "All" },
	];

	function emit(patch) {
		onChange({ search, category, subcategory, sizeType, status, ...patch });
	}
</script>

<div class="controls-row">
	<div class="search-wrap">
		<span class="search-icon">🔍</span>
		<input
			class="search-input"
			type="text"
			placeholder="Search name, garment type, SKU or tag…"
			value={search}
			oninput={(e) => emit({ search: e.currentTarget.value })}
		/>
	</div>

	<select
		class="filter-select"
		value={category}
		onchange={(e) => emit({ category: e.currentTarget.value, subcategory: "" })}
	>
		{#each CATEGORIES as opt}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>

	{#if category === "bridal"}
		<select class="filter-select" value={subcategory} onchange={(e) => emit({ subcategory: e.currentTarget.value })}>
			{#each SUBCATEGORIES as opt}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		</select>
	{/if}

	<select class="filter-select" value={sizeType} onchange={(e) => emit({ sizeType: e.currentTarget.value })}>
		{#each SIZE_TYPES as opt}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>

	<select class="filter-select" value={status} onchange={(e) => emit({ status: e.currentTarget.value })}>
		{#each STATUSES as opt}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
</div>

<style>
	.controls-row {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 16px;
		flex-wrap: wrap;
	}

	.search-wrap {
		flex: 1;
		max-width: 300px;
		position: relative;
	}

	.search-input {
		width: 100%;
		padding: 8px 12px 8px 34px;
		background: var(--white);
		border: 1px solid var(--border);
		border-radius: 9px;
		font-size: 13px;
		font-family: 'DM Sans', sans-serif;
		color: var(--text);
		outline: none;
		transition: border-color 0.15s;
	}

	.search-input:focus {
		border-color: var(--gold);
	}

	.search-icon {
		position: absolute;
		left: 11px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 13px;
		color: var(--text-faint);
		pointer-events: none;
	}

	.filter-select {
		appearance: none;
		background: var(--white);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 8px 28px 8px 11px;
		font-size: 12px;
		color: var(--text);
		font-family: 'DM Sans', sans-serif;
		cursor: pointer;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23B0AAA2' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 9px center;
		outline: none;
	}

	.filter-select:focus {
		border-color: var(--gold);
	}

	@media (max-width: 767px) {
		.controls-row {
			flex-direction: column;
			align-items: stretch;
		}

		.search-wrap {
			max-width: none;
		}
	}
</style>
