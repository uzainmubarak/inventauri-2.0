<script>
	import { goto } from "$app/navigation";
	import { createStockDressWithDetails } from "$lib/services/stockDressesService";
	import VariantList from "../components/VariantList.svelte";

	let name = $state("");
	let garmentType = $state("");
	let category = $state("party_wear");
	let subcategory = $state("");
	let basePrice = $state("");
	let productionCost = $state("");
	let notes = $state("");
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

	function buildFormData(status) {
		return {
			dress: {
				name,
				garment_type: garmentType,
				category,
				subcategory: category === "bridal" && subcategory ? subcategory : null,
				base_price: Number(basePrice),
				production_cost: productionCost ? Number(productionCost) : null,
				notes: notes || null,
				status,
			},
			images,
			options: [],
			variants: variants.map((v) => ({
				price_override: v.price_override,
				quantity: v.quantity,
				axisValues: v.size ? [{ axis: "size", value: v.size }] : [],
			})),
		};
	}

	async function save(status) {
		saving = true;
		error = null;

		const { error: createError } = await createStockDressWithDetails(buildFormData(status));

		saving = false;
		if (createError) {
			error = createError;
			return;
		}
		goto("/stock");
	}

	function handleSubmit(e) {
		e.preventDefault();
		save("available");
	}

	function handleSaveDraft() {
		// Draft mode skips the browser's native required-field validation
		// (a draft is explicitly allowed to be incomplete) — required fields
		// still apply when publishing via the main submit button.
		save("draft");
	}
</script>

<div class="topbar">
	<div class="breadcrumb">
		<a href="/stock">Stock Dresses</a> <span>/ Add New</span>
	</div>
</div>

<div class="content-area">
	<div class="scroll-area">
		<div class="page-header">
			<div>
				<div class="page-title">Add Stock Dress</div>
				<div class="page-meta">Add a finished ready-made dress to the catalog</div>
			</div>
		</div>

		<form class="stock-form" onsubmit={handleSubmit}>
			<div class="form-section">
				<div class="section-title">Basics</div>
				<label class="form-field">
					<span>Name</span>
					<input type="text" bind:value={name} required={!saving} />
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
				<div class="section-title">Variants</div>
				<VariantList {variants} editable={true} onChange={(v) => (variants = v)} />
			</div>

			{#if error}
				<p class="error-text">Error: {error}</p>
			{/if}

			<div class="form-actions">
				<a href="/stock" class="btn-secondary">Cancel</a>
				<button type="button" class="btn-outline" onclick={handleSaveDraft} disabled={saving}>
					{saving ? "Saving…" : "Save Draft"}
				</button>
				<button type="submit" class="btn-gold" disabled={saving}>
					{saving ? "Saving…" : "Create Stock Dress"}
				</button>
			</div>
		</form>
	</div>
</div>

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

	.breadcrumb a {
		color: var(--text-muted);
		text-decoration: none;
	}

	.breadcrumb a:hover {
		color: var(--gold);
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

	.stock-form {
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-width: 640px;
	}

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

	.error-text {
		color: var(--error);
		font-size: 12px;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		padding-bottom: 20px;
	}

	.btn-gold {
		background: var(--gold);
		border: none;
		border-radius: 8px;
		padding: 10px 18px;
		font-size: 12px;
		font-weight: 500;
		color: #fff;
		cursor: pointer;
	}

	.btn-gold:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-outline {
		background: var(--white);
		border: 1px solid var(--gold-mid);
		color: #8b6914;
		border-radius: 8px;
		padding: 10px 18px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-outline:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: var(--white);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 10px 18px;
		font-size: 12px;
		color: var(--text);
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
	}

	@media (max-width: 767px) {
		.scroll-area {
			padding: 16px;
			padding-bottom: 72px;
		}

		.form-actions {
			flex-direction: column-reverse;
			align-items: stretch;
		}

		.form-actions .btn-secondary,
		.form-actions .btn-outline,
		.form-actions .btn-gold {
			justify-content: center;
			width: 100%;
		}
	}
</style>
