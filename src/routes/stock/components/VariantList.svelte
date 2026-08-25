<script>
	/**
	 * @type {{
	 *   variants: any[],
	 *   editable?: boolean,
	 *   onChange?: (variants: any[]) => void
	 * }}
	 */
	let { variants, editable = false, onChange } = $props();

	function addVariant() {
		if (!editable) return;
		onChange([...variants, { size: "", quantity: null, price_override: null, status: "available" }]);
	}

	function removeVariant(index) {
		if (!editable) return;
		onChange(variants.filter((_, i) => i !== index));
	}

	function updateVariant(index, patch) {
		if (!editable) return;
		onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
	}

	// `size` is the flat in-memory field this component edits directly. It's
	// pre-populated from the DB's axis values when seeding an existing
	// variant for editing (see StockDressFormFields.svelte), so this works
	// the same whether the variant started out new or already persisted.
	function axisValue(variant, axis) {
		if (editable) return variant.size ?? "";
		return variant.stock_dress_variant_values?.find((v) => v.axis === axis)?.value ?? "";
	}
</script>

<div class="variant-section">
	{#if variants.length === 0}
		<p class="variant-empty">No variants yet.</p>
	{:else}
		<!-- Desktop/tablet: table -->
		<div class="variant-table">
			<div class="variant-table-header">
				<div>SKU</div>
				<div>Size</div>
				<div>Qty</div>
				<div>Price Override</div>
				<div>Status</div>
				{#if editable}<div></div>{/if}
			</div>
			{#each variants as variant, i}
				<div class="variant-table-row">
					<div class="variant-sku">{variant.sku ?? "(assigned on save)"}</div>
					<div>
						{#if editable}
							<input
								class="variant-input"
								type="text"
								placeholder="e.g. M"
								value={variant.size}
								oninput={(e) => updateVariant(i, { size: e.currentTarget.value })}
							/>
						{:else}
							{axisValue(variant, "size") || "Custom"}
						{/if}
					</div>
					<div>
						{#if editable}
							<input
								class="variant-input"
								type="number"
								min="0"
								value={variant.quantity ?? ""}
								oninput={(e) => updateVariant(i, { quantity: e.currentTarget.value ? Number(e.currentTarget.value) : null })}
							/>
						{:else}
							{variant.quantity ?? "—"}
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
								oninput={(e) => updateVariant(i, { price_override: e.currentTarget.value ? Number(e.currentTarget.value) : null })}
							/>
						{:else}
							{variant.price_override ? `PKR ${Number(variant.price_override).toLocaleString()}` : "—"}
						{/if}
					</div>
					<div>
						<span class="status-badge status-{variant.status}">{variant.status}</span>
					</div>
					{#if editable}
						<button type="button" class="variant-remove" onclick={() => removeVariant(i)} aria-label="Remove variant">✕</button>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Mobile: stacked cards -->
		<div class="variant-cards">
			{#each variants as variant, i}
				<div class="variant-card">
					<div class="variant-card-header">
						<span class="variant-sku">{variant.sku ?? "(assigned on save)"}</span>
						{#if editable}
							<button type="button" class="variant-remove" onclick={() => removeVariant(i)} aria-label="Remove variant">✕</button>
						{/if}
					</div>
					<div class="variant-card-row">
						<span class="variant-card-label">Size</span>
						{#if editable}
							<input
								class="variant-input"
								type="text"
								placeholder="e.g. M"
								value={variant.size}
								oninput={(e) => updateVariant(i, { size: e.currentTarget.value })}
							/>
						{:else}
							<span>{axisValue(variant, "size") || "Custom"}</span>
						{/if}
					</div>
					<div class="variant-card-row">
						<span class="variant-card-label">Qty</span>
						{#if editable}
							<input
								class="variant-input"
								type="number"
								min="0"
								value={variant.quantity ?? ""}
								oninput={(e) => updateVariant(i, { quantity: e.currentTarget.value ? Number(e.currentTarget.value) : null })}
							/>
						{:else}
							<span>{variant.quantity ?? "—"}</span>
						{/if}
					</div>
					<div class="variant-card-row">
						<span class="variant-card-label">Status</span>
						<span class="status-badge status-{variant.status}">{variant.status}</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if editable}
		<button type="button" class="add-variant-btn" onclick={addVariant}>+ Add Variant</button>
	{/if}
</div>

<style>
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
		grid-template-columns: 1fr 1fr 90px 130px 110px 32px;
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

	.status-badge {
		font-size: 10px;
		font-weight: 500;
		padding: 2px 8px;
		border-radius: 10px;
		text-transform: uppercase;
	}

	.status-available {
		background: var(--green-dim);
		color: var(--green);
	}

	.status-reserved {
		background: var(--gold-dim);
		color: #8b6914;
	}

	.status-sold {
		background: var(--error-dim);
		color: var(--error);
	}

	.status-archived {
		background: #f0efed;
		color: #6b6560;
	}

	.status-draft {
		background: var(--blue-dim, rgba(58, 74, 107, 0.08));
		color: #3a4a6b;
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
			width: 60%;
		}
	}
</style>
