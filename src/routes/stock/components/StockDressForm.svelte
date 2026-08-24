<script>
	import { createStockDressWithDetails, updateStockDress } from "$lib/services/stockDressesService";
	import VariantList from "./VariantList.svelte";

	/**
	 * @type {{
	 *   dress?: any,
	 *   onSaved: () => void,
	 *   onCancel: () => void
	 * }}
	 */
	let { dress = null, onSaved, onCancel } = $props();

	const isEditing = dress !== null;

	let name = $state(dress?.name ?? "");
	let garmentType = $state(dress?.garment_type ?? "");
	let category = $state(dress?.category ?? "party_wear");
	let subcategory = $state(dress?.subcategory ?? "");
	let basePrice = $state(dress?.base_price ?? "");
	let productionCost = $state(dress?.production_cost ?? "");
	let notes = $state(dress?.notes ?? "");
	let imageUrl = $state("");
	let images = $state([]);
	let variants = $state([]);

	let saving = $state(false);
	let error = $state(null);

	function addImageUrl() {
		if (!imageUrl.trim()) return;
		images = [...images, { image_url: imageUrl.trim(), is_primary: images.length === 0 }];
		imageUrl = "";
	}

	function removeImage(index) {
		images = images.filter((_, i) => i !== index);
	}

	async function handleSubmit(e) {
		e.preventDefault();
		saving = true;
		error = null;

		const dressPayload = {
			name,
			garment_type: garmentType,
			category,
			subcategory: category === "bridal" && subcategory ? subcategory : null,
			base_price: Number(basePrice),
			production_cost: productionCost ? Number(productionCost) : null,
			notes: notes || null,
		};

		if (isEditing) {
			const { error: updateError } = await updateStockDress(dress.id, dressPayload);
			saving = false;
			if (updateError) {
				error = updateError;
				return;
			}
			onSaved();
			return;
		}

		const { error: createError } = await createStockDressWithDetails({
			dress: dressPayload,
			images,
			options: [],
			variants: variants.map((v) => ({
				price_override: v.price_override,
				quantity: v.quantity,
				axisValues: v.size ? [{ axis: "size", value: v.size }] : [],
			})),
		});

		saving = false;
		if (createError) {
			error = createError;
			return;
		}
		onSaved();
	}
</script>

<form class="stock-form" onsubmit={handleSubmit}>
	<div class="form-section">
		<div class="section-title">Basics</div>
		<label class="form-field">
			<span>Name</span>
			<input type="text" bind:value={name} required />
		</label>
		<label class="form-field">
			<span>Garment Type</span>
			<input type="text" bind:value={garmentType} required placeholder="e.g. Farshi Lehenga" />
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
			<input type="number" min="0" step="0.01" bind:value={basePrice} required />
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

	{#if !isEditing}
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
			<div class="section-title">Variants</div>
			<VariantList {variants} editable={true} onChange={(v) => (variants = v)} />
		</div>
	{/if}

	{#if error}
		<p class="error-text">Error: {error}</p>
	{/if}

	<div class="form-actions">
		<button type="button" class="btn-secondary" onclick={onCancel}>Cancel</button>
		<button type="submit" class="btn-gold" disabled={saving}>
			{saving ? "Saving…" : isEditing ? "Save Changes" : "Create Stock Dress"}
		</button>
	</div>
</form>

<style>
	.stock-form {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.form-section {
		border: 1px solid var(--border-light);
		border-radius: 10px;
		padding: 16px;
	}

	.section-title {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-faint);
		margin-bottom: 12px;
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
		margin-bottom: 12px;
		font-size: 12px;
		color: var(--text-muted);
	}

	.form-field input,
	.form-field select,
	.form-field textarea {
		padding: 8px 10px;
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
		padding: 8px 10px;
		border: 1px solid var(--border);
		border-radius: 8px;
		font-size: 12px;
	}

	.image-row {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		padding: 6px 0;
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

	.error-text {
		color: var(--error);
		font-size: 12px;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
	}

	.btn-gold {
		background: var(--gold);
		border: none;
		border-radius: 8px;
		padding: 9px 16px;
		font-size: 12px;
		font-weight: 500;
		color: #fff;
		cursor: pointer;
	}

	.btn-gold:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: var(--white);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 9px 16px;
		font-size: 12px;
		color: var(--text);
		cursor: pointer;
	}
</style>
