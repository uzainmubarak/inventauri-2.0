<script>
	import { goto } from "$app/navigation";
	import { createStockDressWithDetails } from "$lib/services/stockDressesService";
	import StockDressFormFields from "../components/StockDressFormFields.svelte";

	let name = $state("");
	let garmentType = $state("");
	let category = $state("party_wear");
	let subcategory = $state("");
	let basePrice = $state("");
	let productionCost = $state("");
	let notes = $state("");
	let images = $state([]);
	let options = $state([]);
	let variants = $state([]);

	let saving = $state(false);
	let error = $state(null);

	function buildFormData(status) {
		return {
			dress: {
				name,
				garment_type: garmentType,
				category,
				subcategory: category === "bridal" && subcategory ? subcategory : null,
				base_price: Number(basePrice) || 0,
				production_cost: productionCost ? Number(productionCost) : null,
				notes: notes || null,
				status,
			},
			images,
			options: options.map((o) => ({ name: o.name, values: o.values })),
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
			<StockDressFormFields
				bind:name
				bind:garmentType
				bind:category
				bind:subcategory
				bind:basePrice
				bind:productionCost
				bind:notes
				bind:images
				bind:options
				bind:variants
			/>

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
