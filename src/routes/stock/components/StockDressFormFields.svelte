<script>
	import VariantList from "./VariantList.svelte";

	/**
	 * Shared field markup for both /stock/new (create) and /stock/[id]/edit
	 * (edit) — Basics, Images, Options, Variants. The parent page owns all
	 * the actual state via bindable props and decides what "Save" means.
	 *
	 * @type {{
	 *   name: string,
	 *   garmentType: string,
	 *   category: string,
	 *   subcategory: string,
	 *   basePrice: string | number,
	 *   productionCost: string | number,
	 *   notes: string,
	 *   images: any[],
	 *   options: any[],
	 *   variants: any[],
	 * }}
	 */
	let {
		name = $bindable(),
		garmentType = $bindable(),
		category = $bindable(),
		subcategory = $bindable(),
		basePrice = $bindable(),
		productionCost = $bindable(),
		notes = $bindable(),
		images = $bindable(),
		options = $bindable(),
		variants = $bindable(),
	} = $props();

	let imageUrl = $state("");
	let newOptionName = $state("");

	function addImageUrl() {
		if (!imageUrl.trim()) return;
		images = [...images, { image_url: imageUrl.trim(), is_primary: images.length === 0 }];
		imageUrl = "";
	}

	function removeImage(index) {
		images = images.filter((_, i) => i !== index);
	}

	function addOption() {
		if (!newOptionName.trim()) return;
		options = [...options, { name: newOptionName.trim(), values: [], newValue: "" }];
		newOptionName = "";
	}

	function removeOption(index) {
		options = options.filter((_, i) => i !== index);
	}

	function addOptionValue(optionIndex) {
		const option = options[optionIndex];
		if (!option.newValue?.trim()) return;
		options = options.map((o, i) =>
			i === optionIndex
				? { ...o, values: [...o.values, { value: o.newValue.trim() }], newValue: "" }
				: o,
		);
	}

	function removeOptionValue(optionIndex, valueIndex) {
		options = options.map((o, i) =>
			i === optionIndex ? { ...o, values: o.values.filter((_, vi) => vi !== valueIndex) } : o,
		);
	}
</script>

<div class="form-section">
	<div class="section-title">Basics</div>
	<label class="form-field">
		<span>Name</span>
		<input type="text" bind:value={name} />
	</label>
	<label class="form-field">
		<span>Garment Type</span>
		<input type="text" bind:value={garmentType} placeholder="e.g. Farshi Lehenga" />
	</label>
	<label class="form-field">
		<span>Category</span>
		<select bind:value={category}>
			<option value="party_wear">Party Wear</option>
			<option value="formals">Formals</option>
			<option value="bridal">Bridal</option>
			<option value="nikkah_wear">Nikkah Wear</option>
		</select>
	</label>
	{#if category === "bridal"}
		<label class="form-field">
			<span>Subcategory</span>
			<select bind:value={subcategory}>
				<option value="">—</option>
				<option value="mehendi">Mehendi</option>
				<option value="barat">Barat</option>
				<option value="walima">Walima</option>
			</select>
		</label>
	{/if}
	<label class="form-field">
		<span>Selling Price (PKR)</span>
		<input type="number" min="0" step="0.01" bind:value={basePrice} />
	</label>
	<label class="form-field">
		<span>Production Cost (PKR, internal only)</span>
		<input type="number" min="0" step="0.01" bind:value={productionCost} />
	</label>
	<label class="form-field">
		<span>Notes</span>
		<textarea bind:value={notes} rows="3"></textarea>
	</label>
</div>

<div class="form-section">
	<div class="section-title">Images</div>
	<p class="section-hint">Paste an image URL (real upload comes in a later pass).</p>
	<div class="image-input-row">
		<input type="url" placeholder="https://…" bind:value={imageUrl} />
		<button type="button" class="btn-secondary" onclick={addImageUrl}>Add</button>
	</div>
	{#each images as img, i}
		<div class="image-row">
			<span class="image-url">{img.image_url}</span>
			{#if img.is_primary}<span class="primary-tag">Primary</span>{/if}
			<button type="button" class="remove-btn" onclick={() => removeImage(i)}>✕</button>
		</div>
	{/each}
</div>

<div class="form-section">
	<div class="section-title">Options</div>
	<p class="section-hint">
		Client customization choices at order time — e.g. "Dupatta Style" with values "Plain" /
		"Painted". Not stocked, not SKU'd.
	</p>
	<div class="image-input-row">
		<input type="text" placeholder="Option name, e.g. Dupatta Style" bind:value={newOptionName} />
		<button type="button" class="btn-secondary" onclick={addOption}>Add Option</button>
	</div>
	{#each options as option, oi}
		<div class="option-block">
			<div class="option-block-header">
				<span class="option-name">{option.name}</span>
				<button type="button" class="remove-btn" onclick={() => removeOption(oi)}>✕</button>
			</div>
			<div class="option-values-row">
				{#each option.values as value, vi}
					<span class="option-value-chip">
						{value.value}
						<button
							type="button"
							class="chip-remove"
							onclick={() => removeOptionValue(oi, vi)}
							aria-label="Remove value">✕</button
						>
					</span>
				{/each}
			</div>
			<div class="image-input-row">
				<input
					type="text"
					placeholder="Value, e.g. Plain"
					bind:value={option.newValue}
					onkeydown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							addOptionValue(oi);
						}
					}}
				/>
				<button type="button" class="btn-secondary" onclick={() => addOptionValue(oi)}>Add Value</button>
			</div>
		</div>
	{/each}
</div>

<div class="form-section">
	<div class="section-title">Variants</div>
	<VariantList {variants} editable={true} onChange={(v) => (variants = v)} />
</div>

<style>
	.form-section {
		border: 1px solid var(--border-light);
		border-radius: 10px;
		padding: 18px;
		background: var(--white);
	}

	.section-title {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-faint);
		margin-bottom: 14px;
	}

	.section-hint {
		font-size: 11px;
		color: var(--text-muted);
		margin-bottom: 8px;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 14px;
		font-size: 12px;
		color: var(--text-muted);
	}

	.form-field input,
	.form-field select,
	.form-field textarea {
		padding: 9px 11px;
		border: 1px solid var(--border);
		border-radius: 8px;
		font-size: 13px;
		font-family: 'DM Sans', sans-serif;
		color: var(--text);
	}

	.image-input-row {
		display: flex;
		gap: 8px;
		margin-bottom: 10px;
	}

	.image-input-row input {
		flex: 1;
		padding: 9px 11px;
		border: 1px solid var(--border);
		border-radius: 8px;
		font-size: 12px;
	}

	.image-row {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		padding: 8px 0;
		border-top: 1px solid var(--border-light);
	}

	.image-url {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text-muted);
	}

	.primary-tag {
		background: var(--gold-dim);
		color: #8b6914;
		font-size: 9px;
		padding: 2px 6px;
		border-radius: 8px;
	}

	.remove-btn {
		background: none;
		border: none;
		color: var(--text-faint);
		cursor: pointer;
	}

	.option-block {
		border-top: 1px solid var(--border-light);
		padding-top: 12px;
		margin-top: 12px;
	}

	.option-block:first-of-type {
		border-top: none;
		padding-top: 0;
		margin-top: 0;
	}

	.option-block-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}

	.option-name {
		font-size: 13px;
		font-weight: 500;
	}

	.option-values-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 8px;
	}

	.option-value-chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		background: var(--bg2);
		border: 1px solid var(--border);
		border-radius: 20px;
		padding: 3px 6px 3px 10px;
		font-size: 11px;
		color: var(--text);
	}

	.chip-remove {
		background: none;
		border: none;
		color: var(--text-faint);
		cursor: pointer;
		font-size: 10px;
		padding: 2px;
	}
</style>
