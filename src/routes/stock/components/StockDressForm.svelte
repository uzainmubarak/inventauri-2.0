<script>
	import { updateStockDress } from "$lib/services/stockDressesService";

	// Edit-only: creating a new stock dress has its own page (/stock/new)
	// since that flow has more scope (images, variants, save-as-draft).
	// This component only ever edits an existing dress's Basics section.
	/**
	 * @type {{
	 *   dress: any,
	 *   onSaved: () => void,
	 *   onCancel: () => void
	 * }}
	 */
	let { dress, onSaved, onCancel } = $props();

	let name = $state(dress.name);
	let garmentType = $state(dress.garment_type);
	let category = $state(dress.category);
	let subcategory = $state(dress.subcategory ?? "");
	let basePrice = $state(dress.base_price);
	let productionCost = $state(dress.production_cost ?? "");
	let notes = $state(dress.notes ?? "");

	let saving = $state(false);
	let error = $state(null);

	async function handleSubmit(e) {
		e.preventDefault();
		saving = true;
		error = null;

		const { error: updateError } = await updateStockDress(dress.id, {
			name,
			garment_type: garmentType,
			category,
			subcategory: category === "bridal" && subcategory ? subcategory : null,
			base_price: Number(basePrice),
			production_cost: productionCost ? Number(productionCost) : null,
			notes: notes || null,
		});

		saving = false;
		if (updateError) {
			error = updateError;
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

	{#if error}
		<p class="error-text">Error: {error}</p>
	{/if}

	<div class="form-actions">
		<button type="button" class="btn-secondary" onclick={onCancel}>Cancel</button>
		<button type="submit" class="btn-gold" disabled={saving}>
			{saving ? "Saving…" : "Save Changes"}
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
