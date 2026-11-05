<script>
	import { generateVariantMatrix } from "$lib/stock/variantMatrix";

	/**
	 * Variants are the countable, SKU'd units of a design. Axes (size, colour,
	 * fabric) combine into them; anything made only once a customer asks for
	 * it is an Option instead. See docs/stock-module-schema.md.
	 *
	 * @type {{
	 *   variants: any[],
	 *   editable?: boolean,
	 *   onChange?: (variants: any[]) => void
	 * }}
	 */
	let { variants, editable = false, onChange } = $props();

	const AXES = ["size", "color", "fabric", "other"];
	const MAX_VARIANTS = 100;

	/** @type {{ axis: string, values: string[], newValue: string }[]} */
	let axes = $state([]);
	let newAxis = $state("size");
	/** @type {string | null} */
	let matrixNotice = $state(null);

	/** @param {any[]} next */
	function emit(next) {
		onChange?.(next);
	}

	function addAxis() {
		if (axes.some((a) => a.axis === newAxis)) return;
		axes = [...axes, { axis: newAxis, values: [], newValue: "" }];
	}

	/** @param {number} index */
	function removeAxis(index) {
		axes = axes.filter((_, i) => i !== index);
	}

	/** @param {number} index */
	function addAxisValue(index) {
		const axis = axes[index];
		const value = axis.newValue?.trim();
		if (!value) return;
		if (axis.values.some((v) => v.toLowerCase() === value.toLowerCase())) {
			axes = axes.map((a, i) => (i === index ? { ...a, newValue: "" } : a));
			return;
		}
		axes = axes.map((a, i) =>
			i === index ? { ...a, values: [...a.values, value], newValue: "" } : a,
		);
	}

	/** @param {number} axisIndex @param {number} valueIndex */
	function removeAxisValue(axisIndex, valueIndex) {
		axes = axes.map((a, i) =>
			i === axisIndex ? { ...a, values: a.values.filter((_, vi) => vi !== valueIndex) } : a,
		);
	}

	function generate() {
		const { variants: combinations, truncated, total } = generateVariantMatrix(
			axes.map((a) => ({ axis: a.axis, values: a.values })),
			{ max: MAX_VARIANTS },
		);

		// Existing variants are matched by their axis signature so regenerating
		// keeps their ids — and therefore their stock history — intact.
		const existing = new Map(variants.map((v) => [signature(v.axisValues ?? []), v]));

		const next = combinations.map((axisValues) => {
			const match = existing.get(signature(axisValues));
			if (match) return match;
			return { axisValues, quantity: 0, price_override: null, status: "active" };
		});

		matrixNotice = truncated
			? `${total} combinations would be created; showing the first ${MAX_VARIANTS}. Remove some values to generate the rest.`
			: null;

		emit(next);
	}

	/** @param {{axis: string, value: string}[]} axisValues */
	function signature(axisValues) {
		return [...axisValues]
			.sort((a, b) => a.axis.localeCompare(b.axis))
			.map((v) => `${v.axis}=${v.value.toLowerCase()}`)
			.join("|");
	}

	function addBlankVariant() {
		emit([...variants, { axisValues: [], quantity: 0, price_override: null, status: "active" }]);
	}

	/** @param {number} index */
	function removeVariant(index) {
		const variant = variants[index];
		// A saved variant may already have movements behind it, and
		// stock_movements.variant_id is ON DELETE RESTRICT. Archiving is both
		// what the schema allows and what preserves the history.
		if (variant.id) {
			emit(variants.map((v, i) => (i === index ? { ...v, status: "archived" } : v)));
			return;
		}
		emit(variants.filter((_, i) => i !== index));
	}

	/** @param {number} index @param {any} patch */
	function updateVariant(index, patch) {
		emit(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
	}

	/** @param {any} variant */
	function describe(variant) {
		const values = variant.axisValues ?? [];
		if (values.length === 0) return "Custom";
		return values.map(/** @param {any} v */ (v) => v.value).join(" · ");
	}

	const visibleVariants = $derived(
		variants.filter(/** @param {any} v */ (v) => v.status !== "archived"),
	);

	/** @param {any} variant */
	function indexOf(variant) {
		return variants.indexOf(variant);
	}
</script>

{#if editable}
	<div class="axis-builder">
		<p class="hint">
			Define the axes you actually stock, then generate the combinations. A design you only ever
			make to order needs no axes at all.
		</p>

		{#each axes as axis, ai}
			<div class="axis-block">
				<div class="axis-header">
					<span class="axis-name">{axis.axis}</span>
					<button type="button" class="remove-btn" onclick={() => removeAxis(ai)} aria-label="Remove axis">✕</button>
				</div>
				<div class="chip-row">
					{#each axis.values as value, vi}
						<span class="chip">
							{value}
							<button
								type="button"
								class="chip-remove"
								onclick={() => removeAxisValue(ai, vi)}
								aria-label="Remove value">✕</button
							>
						</span>
					{/each}
				</div>
				<div class="inline-input-row">
					<input
						type="text"
						placeholder={axis.axis === "size" ? "e.g. M" : "e.g. Red"}
						bind:value={axis.newValue}
						onkeydown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								addAxisValue(ai);
							}
						}}
					/>
					<button type="button" class="btn-secondary" onclick={() => addAxisValue(ai)}>Add Value</button>
				</div>
			</div>
		{/each}

		<div class="inline-input-row">
			<select bind:value={newAxis}>
				{#each AXES as axisOption}
					<option value={axisOption} disabled={axes.some((a) => a.axis === axisOption)}>
						{axisOption}
					</option>
				{/each}
			</select>
			<button type="button" class="btn-secondary" onclick={addAxis}>Add Axis</button>
			<button type="button" class="btn-outline" onclick={generate} disabled={axes.length === 0}>
				Generate variants
			</button>
		</div>

		{#if matrixNotice}
			<p class="notice">{matrixNotice}</p>
		{/if}
	</div>
{/if}

<div class="variant-section">
	{#if visibleVariants.length === 0}
		<p class="variant-empty">No variants yet.</p>
	{:else}
		<!-- Desktop/tablet: table -->
		<div class="variant-table">
			<div class="variant-table-header">
				<div>Variant</div>
				<div>SKU</div>
				<div>Barcode</div>
				<div>Qty</div>
				<div>Price Override</div>
				{#if editable}<div></div>{/if}
			</div>
			{#each visibleVariants as variant}
				<div class="variant-table-row">
					<div>{describe(variant)}</div>
					<div class="variant-sku">{variant.sku ?? "(assigned on save)"}</div>
					<div class="variant-sku">{variant.barcode ?? "—"}</div>
					<div>
						{#if editable && !variant.id}
							<input
								class="variant-input"
								type="number"
								min="0"
								value={variant.quantity ?? 0}
								oninput={(e) =>
									updateVariant(indexOf(variant), {
										quantity: e.currentTarget.value ? Number(e.currentTarget.value) : 0,
									})}
							/>
						{:else}
							<span class="qty-readonly" title="Changed by recording a stock movement">
								{variant.quantity ?? 0}
							</span>
						{/if}
					</div>
					<div>
						{#if editable}
							<input
								class="variant-input"
								type="number"
								min="0"
								step="0.01"
								placeholder="—"
								value={variant.price_override ?? ""}
								oninput={(e) =>
									updateVariant(indexOf(variant), {
										price_override: e.currentTarget.value ? Number(e.currentTarget.value) : null,
									})}
							/>
						{:else}
							{variant.price_override
								? `PKR ${Number(variant.price_override).toLocaleString()}`
								: "—"}
						{/if}
					</div>
					{#if editable}
						<button
							type="button"
							class="variant-remove"
							onclick={() => removeVariant(indexOf(variant))}
							aria-label="Remove variant">✕</button
						>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Mobile: stacked cards -->
		<div class="variant-cards">
			{#each visibleVariants as variant}
				<div class="variant-card">
					<div class="variant-card-header">
						<span class="variant-card-title">{describe(variant)}</span>
						{#if editable}
							<button
								type="button"
								class="variant-remove"
								onclick={() => removeVariant(indexOf(variant))}
								aria-label="Remove variant">✕</button
							>
						{/if}
					</div>
					<div class="variant-card-row">
						<span class="variant-card-label">SKU</span>
						<span class="variant-sku">{variant.sku ?? "(assigned on save)"}</span>
					</div>
					<div class="variant-card-row">
						<span class="variant-card-label">Qty</span>
						{#if editable && !variant.id}
							<input
								class="variant-input"
								type="number"
								min="0"
								value={variant.quantity ?? 0}
								oninput={(e) =>
									updateVariant(indexOf(variant), {
										quantity: e.currentTarget.value ? Number(e.currentTarget.value) : 0,
									})}
							/>
						{:else}
							<span>{variant.quantity ?? 0}</span>
						{/if}
					</div>
					<div class="variant-card-row">
						<span class="variant-card-label">Price Override</span>
						{#if editable}
							<input
								class="variant-input"
								type="number"
								min="0"
								step="0.01"
								placeholder="—"
								value={variant.price_override ?? ""}
								oninput={(e) =>
									updateVariant(indexOf(variant), {
										price_override: e.currentTarget.value ? Number(e.currentTarget.value) : null,
									})}
							/>
						{:else}
							<span
								>{variant.price_override
									? `PKR ${Number(variant.price_override).toLocaleString()}`
									: "—"}</span
							>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if editable}
		<p class="hint qty-hint">
			Quantity is editable only before a variant is saved — that number becomes its opening stock
			entry. After that it moves only by recording a stock movement.
		</p>
		<button type="button" class="add-variant-btn" onclick={addBlankVariant}>
			+ Add variant without axes
		</button>
	{/if}
</div>

<style>
	.axis-builder {
		border: 1px dashed var(--border);
		border-radius: 10px;
		padding: 14px;
		margin-bottom: 14px;
	}

	.hint {
		font-size: 11px;
		color: var(--text-muted);
		margin-bottom: 10px;
	}

	.qty-hint {
		margin-top: 10px;
		margin-bottom: 0;
	}

	.notice {
		font-size: 11px;
		color: #8b6914;
		background: var(--gold-dim);
		border-radius: 6px;
		padding: 7px 9px;
		margin-top: 8px;
	}

	.axis-block {
		border-top: 1px solid var(--border-light);
		padding-top: 10px;
		margin-top: 10px;
	}

	.axis-block:first-of-type {
		border-top: none;
		padding-top: 0;
		margin-top: 0;
	}

	.axis-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 6px;
	}

	.axis-name {
		font-size: 12px;
		font-weight: 500;
		text-transform: capitalize;
	}

	.chip-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 8px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		background: var(--bg2);
		border: 1px solid var(--border);
		border-radius: 20px;
		padding: 3px 6px 3px 10px;
		font-size: 11px;
	}

	.chip-remove,
	.remove-btn {
		background: none;
		border: none;
		color: var(--text-faint);
		cursor: pointer;
		font-size: 10px;
		padding: 2px;
	}

	.inline-input-row {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.inline-input-row input,
	.inline-input-row select {
		flex: 1;
		padding: 8px 10px;
		border: 1px solid var(--border);
		border-radius: 8px;
		font-size: 12px;
		font-family: 'DM Sans', sans-serif;
	}

	.inline-input-row select {
		text-transform: capitalize;
	}

	.btn-secondary {
		background: var(--white);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 8px 14px;
		font-size: 12px;
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-outline {
		background: var(--white);
		border: 1px solid var(--gold-mid);
		color: #8b6914;
		border-radius: 8px;
		padding: 8px 14px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-outline:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.variant-empty {
		color: var(--text-muted);
		font-size: 12px;
		padding: 12px 0;
	}

	.variant-table {
		border: 1px solid var(--border);
		border-radius: 10px;
		overflow: hidden;
	}

	.variant-table-header,
	.variant-table-row {
		display: grid;
		grid-template-columns: 1.2fr 1.3fr 1.3fr 80px 120px 32px;
		align-items: center;
		padding: 10px 12px;
		gap: 8px;
	}

	.variant-table-header {
		background: #f5f3f0;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-faint);
	}

	.variant-table-row {
		border-top: 1px solid var(--border-light);
		font-size: 12px;
	}

	.variant-sku {
		font-family: 'JetBrains Mono', monospace;
		color: var(--text-muted);
		font-size: 11px;
	}

	.qty-readonly {
		color: var(--text-muted);
	}

	.variant-input {
		width: 100%;
		padding: 5px 8px;
		border: 1px solid var(--border);
		border-radius: 6px;
		font-size: 12px;
		font-family: 'DM Sans', sans-serif;
	}

	.variant-remove {
		background: none;
		border: none;
		color: var(--text-faint);
		cursor: pointer;
		font-size: 13px;
	}

	.add-variant-btn {
		margin-top: 10px;
		background: none;
		border: 1px dashed var(--border);
		border-radius: 8px;
		padding: 8px 14px;
		font-size: 12px;
		color: var(--text-muted);
		cursor: pointer;
		width: 100%;
	}

	.variant-cards {
		display: none;
	}

	@media (max-width: 767px) {
		.variant-table {
			display: none;
		}

		.variant-cards {
			display: flex;
			flex-direction: column;
			gap: 10px;
		}

		.variant-card {
			border: 1px solid var(--border);
			border-radius: 10px;
			padding: 12px;
		}

		.variant-card-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 8px;
		}

		.variant-card-title {
			font-weight: 500;
			font-size: 13px;
		}

		.variant-card-row {
			display: flex;
			justify-content: space-between;
			align-items: center;
			font-size: 12px;
			margin-bottom: 6px;
		}

		.variant-card-label {
			color: var(--text-muted);
		}

		.variant-card-row .variant-input {
			width: 55%;
		}
	}
</style>
