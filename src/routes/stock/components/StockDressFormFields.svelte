<script>
	import VariantList from "./VariantList.svelte";
	import { computeProfit, computeMargin } from "$lib/stock/pricing";
	import { normaliseTags } from "$lib/stock/tags";

	/**
	 * Shared field markup for both /stock/new (create) and /stock/[id]/edit
	 * (edit). The parent page owns all the state via bindable props and
	 * decides what "Save" means.
	 *
	 * @type {{
	 *   name: string,
	 *   garmentType: string,
	 *   category: string,
	 *   subcategory: string,
	 *   description: string,
	 *   notes: string,
	 *   tags: string[],
	 *   price: string | number,
	 *   compareAtPrice: string | number,
	 *   cost: string | number,
	 *   trackQuantity: boolean,
	 *   madeToOrder: boolean,
	 *   weightGrams: string | number,
	 *   lengthCm: string | number,
	 *   widthCm: string | number,
	 *   heightCm: string | number,
	 *   images: any[],
	 *   options: any[],
	 *   variants: any[],
	 *   priceError?: string | null,
	 * }}
	 */
	let {
		name = $bindable(),
		garmentType = $bindable(),
		category = $bindable(),
		subcategory = $bindable(),
		description = $bindable(),
		notes = $bindable(),
		tags = $bindable(),
		price = $bindable(),
		compareAtPrice = $bindable(),
		cost = $bindable(),
		trackQuantity = $bindable(),
		madeToOrder = $bindable(),
		weightGrams = $bindable(),
		lengthCm = $bindable(),
		widthCm = $bindable(),
		heightCm = $bindable(),
		images = $bindable(),
		options = $bindable(),
		variants = $bindable(),
		priceError = $bindable(),
	} = $props();

	let imageUrl = $state("");
	let newOptionName = $state("");
	let newTag = $state("");
	let shippingOpen = $state(false);

	// Derived, never stored — a saved copy would go stale the moment cost or
	// price changed. See docs/stock-module-schema.md.
	const profit = $derived(computeProfit(price, cost));
	const margin = $derived(computeMargin(price, cost));

	// Caught here rather than letting the database CHECK be what tells the
	// user: "violates check constraint compare_at_above_price" is not an
	// error message a person should ever see.
	const compareAtInvalid = $derived(
		compareAtPrice !== "" &&
			compareAtPrice !== null &&
			compareAtPrice !== undefined &&
			Number(compareAtPrice) <= Number(price),
	);

	$effect(() => {
		priceError = compareAtInvalid
			? "Compare-at price must be higher than the price — it is the “was” price."
			: null;
	});

	function addTag() {
		if (!newTag.trim()) return;
		tags = normaliseTags([...tags, newTag]);
		newTag = "";
	}

	/** @param {number} index */
	function removeTag(index) {
		tags = tags.filter(/** @param {string} _ @param {number} i */ (_, i) => i !== index);
	}

	function addImageUrl() {
		if (!imageUrl.trim()) return;
		images = [...images, { image_url: imageUrl.trim(), is_primary: images.length === 0 }];
		imageUrl = "";
	}

	/** @param {number} index */
	function removeImage(index) {
		images = images.filter(/** @param {any} _ @param {number} i */ (_, i) => i !== index);
	}

	function addOption() {
		if (!newOptionName.trim()) return;
		options = [...options, { name: newOptionName.trim(), values: [], newValue: "", newAdjustment: "" }];
		newOptionName = "";
	}

	/** @param {number} index */
	function removeOption(index) {
		options = options.filter(/** @param {any} _ @param {number} i */ (_, i) => i !== index);
	}

	/** @param {number} optionIndex */
	function addOptionValue(optionIndex) {
		const option = options[optionIndex];
		if (!option.newValue?.trim()) return;
		options = options.map(/** @param {any} o @param {number} i */ (o, i) =>
			i === optionIndex
				? {
						...o,
						values: [
							...o.values,
							{
								value: o.newValue.trim(),
								price_adjustment: Number(o.newAdjustment) || 0,
							},
						],
						newValue: "",
						newAdjustment: "",
					}
				: o,
		);
	}

	/** @param {number} optionIndex @param {number} valueIndex */
	function removeOptionValue(optionIndex, valueIndex) {
		options = options.map(/** @param {any} o @param {number} i */ (o, i) =>
			i === optionIndex
				? {
						...o,
						values: o.values.filter(
							/** @param {any} _ @param {number} vi */ (_, vi) => vi !== valueIndex,
						),
					}
				: o,
		);
	}

	/** @param {number} value */
	function money(value) {
		return Number(value).toLocaleString();
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
		<span>Description</span>
		<textarea bind:value={description} rows="3" placeholder="Shown to customers"></textarea>
	</label>
	<label class="form-field">
		<span>Internal Notes</span>
		<textarea bind:value={notes} rows="2" placeholder="Staff only — never shown to a client"></textarea>
	</label>

	<div class="form-field">
		<span>Tags</span>
		<div class="chip-row">
			{#each tags as tag, i}
				<span class="chip">
					{tag}
					<button type="button" class="chip-remove" onclick={() => removeTag(i)} aria-label="Remove tag">✕</button>
				</span>
			{/each}
		</div>
		<div class="inline-input-row">
			<input
				type="text"
				placeholder="e.g. zari"
				bind:value={newTag}
				onkeydown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						addTag();
					}
				}}
			/>
			<button type="button" class="btn-secondary" onclick={addTag}>Add Tag</button>
		</div>
	</div>
</div>

<div class="form-section">
	<div class="section-title">Pricing</div>
	<label class="form-field">
		<span>Price (PKR)</span>
		<input type="number" min="0" step="0.01" bind:value={price} />
	</label>
	<label class="form-field">
		<span>Compare-at Price (PKR, optional)</span>
		<input type="number" min="0" step="0.01" bind:value={compareAtPrice} placeholder="The “was” price" />
	</label>
	{#if compareAtInvalid}
		<p class="field-error">{priceError}</p>
	{/if}
	<label class="form-field">
		<span>Cost per Item (PKR, internal only)</span>
		<input type="number" min="0" step="0.01" bind:value={cost} />
	</label>

	<div class="derived-row">
		<div class="derived-cell">
			<span class="derived-label">Profit</span>
			<span class="derived-value">{profit === null ? "—" : `PKR ${money(profit)}`}</span>
		</div>
		<div class="derived-cell">
			<span class="derived-label">Margin</span>
			<span class="derived-value">{margin === null ? "—" : `${(margin * 100).toFixed(1)}%`}</span>
		</div>
	</div>
</div>

<div class="form-section">
	<div class="section-title">Inventory</div>
	<label class="check-field">
		<input type="checkbox" bind:checked={trackQuantity} />
		<span>
			<strong>Track quantity</strong>
			<small>Off for pieces you never count — quantity stays at zero and no stock is recorded.</small>
		</span>
	</label>
	<label class="check-field">
		<input type="checkbox" bind:checked={madeToOrder} />
		<span>
			<strong>Can be made to order</strong>
			<small>Selling the last one leaves this design orderable instead of sold out — a new one gets made.</small>
		</span>
	</label>
</div>

<div class="form-section">
	<div class="section-title">Images</div>
	<p class="section-hint">Paste an image URL (real upload comes in a later pass).</p>
	<div class="inline-input-row">
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
		Choices made at order time that are not stocked separately — e.g. “Dupatta Style” with
		“Plain” / “Hand-painted”. Anything you keep on the rack ready to sell is a variant, not an
		option.
	</p>
	<div class="inline-input-row">
		<input type="text" placeholder="Option name, e.g. Dupatta Style" bind:value={newOptionName} />
		<button type="button" class="btn-secondary" onclick={addOption}>Add Option</button>
	</div>
	{#each options as option, oi}
		<div class="option-block">
			<div class="option-block-header">
				<span class="option-name">{option.name}</span>
				<button type="button" class="remove-btn" onclick={() => removeOption(oi)}>✕</button>
			</div>
			<div class="chip-row">
				{#each option.values as value, vi}
					<span class="chip">
						{value.value}{#if Number(value.price_adjustment)}<span class="chip-adjust"
								>+{money(value.price_adjustment)}</span
							>{/if}
						<button
							type="button"
							class="chip-remove"
							onclick={() => removeOptionValue(oi, vi)}
							aria-label="Remove value">✕</button
						>
					</span>
				{/each}
			</div>
			<div class="inline-input-row">
				<input
					type="text"
					placeholder="Value, e.g. Hand-painted"
					bind:value={option.newValue}
					onkeydown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							addOptionValue(oi);
						}
					}}
				/>
				<input
					class="adjust-input"
					type="number"
					step="0.01"
					placeholder="+PKR"
					bind:value={option.newAdjustment}
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

<div class="form-section">
	<button
		type="button"
		class="section-toggle"
		onclick={() => (shippingOpen = !shippingOpen)}
		aria-expanded={shippingOpen}
	>
		<span class="section-title">Shipping</span>
		<span class="toggle-caret">{shippingOpen ? "−" : "+"}</span>
	</button>
	{#if shippingOpen}
		<p class="section-hint">Optional — only needed if your courier prices on weight or volume.</p>
		<label class="form-field">
			<span>Weight (grams)</span>
			<input type="number" min="0" bind:value={weightGrams} />
		</label>
		<div class="dimension-row">
			<label class="form-field">
				<span>Length (cm)</span>
				<input type="number" min="0" step="0.01" bind:value={lengthCm} />
			</label>
			<label class="form-field">
				<span>Width (cm)</span>
				<input type="number" min="0" step="0.01" bind:value={widthCm} />
			</label>
			<label class="form-field">
				<span>Height (cm)</span>
				<input type="number" min="0" step="0.01" bind:value={heightCm} />
			</label>
		</div>
	{/if}
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
		display: block;
	}

	.section-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font-family: 'DM Sans', sans-serif;
	}

	.section-toggle .section-title {
		margin-bottom: 0;
	}

	.toggle-caret {
		color: var(--text-faint);
		font-size: 14px;
	}

	.section-hint {
		font-size: 11px;
		color: var(--text-muted);
		margin-bottom: 8px;
		margin-top: 10px;
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

	.field-error {
		font-size: 11px;
		color: var(--error);
		margin: -8px 0 12px;
	}

	.derived-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		border: 1px solid var(--border-light);
		border-radius: 8px;
		overflow: hidden;
		background: var(--bg2);
	}

	.derived-cell {
		padding: 10px 12px;
		border-right: 1px solid var(--border-light);
	}

	.derived-cell:last-child {
		border-right: none;
	}

	.derived-label {
		display: block;
		font-size: 10px;
		color: var(--text-faint);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-bottom: 3px;
	}

	.derived-value {
		font-size: 14px;
		font-weight: 500;
		color: var(--text);
	}

	.check-field {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		margin-bottom: 14px;
		font-size: 13px;
		cursor: pointer;
	}

	.check-field input {
		margin-top: 3px;
	}

	.check-field strong {
		display: block;
		font-weight: 500;
		color: var(--text);
	}

	.check-field small {
		display: block;
		font-size: 11px;
		color: var(--text-muted);
		margin-top: 2px;
	}

	.dimension-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}

	.inline-input-row {
		display: flex;
		gap: 8px;
		margin-bottom: 10px;
	}

	.inline-input-row input {
		flex: 1;
		padding: 9px 11px;
		border: 1px solid var(--border);
		border-radius: 8px;
		font-size: 12px;
		font-family: 'DM Sans', sans-serif;
	}

	.adjust-input {
		max-width: 110px;
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
		color: var(--text);
	}

	.chip-adjust {
		color: #8b6914;
		font-weight: 500;
		margin-left: 4px;
	}

	.chip-remove {
		background: none;
		border: none;
		color: var(--text-faint);
		cursor: pointer;
		font-size: 10px;
		padding: 2px;
	}

	@media (max-width: 767px) {
		.dimension-row {
			grid-template-columns: 1fr;
		}
	}
</style>
