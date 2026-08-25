<script>
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { getStockDressById, updateStockDressWithDetails } from "$lib/services/stockDressesService";
	import StockDressFormFields from "../../components/StockDressFormFields.svelte";

	const dressId = page.params.id;

	let loading = $state(true);
	let loadError = $state(null);
	let originalStatus = $state(null);

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

	// Snapshots of what's currently in the DB, used to diff against the
	// edited lists on save (see updateStockDressWithDetails).
	let currentImages = $state([]);
	let currentOptions = $state([]);
	let currentVariants = $state([]);

	let saving = $state(false);
	let saveError = $state(null);

	$effect(() => {
		load();
	});

	async function load() {
		loading = true;
		loadError = null;
		const { data, error } = await getStockDressById(dressId);
		loading = false;
		if (error) {
			loadError = error;
			return;
		}

		name = data.name;
		garmentType = data.garment_type;
		category = data.category;
		subcategory = data.subcategory ?? "";
		basePrice = data.base_price;
		productionCost = data.production_cost ?? "";
		notes = data.notes ?? "";
		originalStatus = data.status;

		currentImages = data.stock_dress_images ?? [];
		images = currentImages.map((img) => ({ ...img }));

		currentOptions = data.stock_dress_options ?? [];
		options = currentOptions.map((o) => ({
			id: o.id,
			name: o.name,
			values: (o.stock_dress_option_values ?? []).map((v) => ({ ...v })),
			newValue: "",
		}));

		currentVariants = (data.stock_dress_variants ?? []).filter((v) => v.status !== "archived");
		variants = currentVariants.map((v) => ({
			id: v.id,
			sku: v.sku,
			size: v.stock_dress_variant_values?.find((av) => av.axis === "size")?.value ?? "",
			quantity: v.quantity,
			price_override: v.price_override,
			status: v.status,
		}));
	}

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
			currentImages,
			images,
			currentOptions,
			options: options.map((o) => ({ id: o.id, name: o.name, values: o.values })),
			currentVariants,
			variants: variants.map((v) => ({
				id: v.id,
				price_override: v.price_override,
				quantity: v.quantity,
				axisValues: v.size ? [{ axis: "size", value: v.size }] : [],
			})),
		};
	}

	async function save(status) {
		saving = true;
		saveError = null;

		const { error } = await updateStockDressWithDetails(dressId, buildFormData(status));

		saving = false;
		if (error) {
			saveError = error;
			return;
		}
		goto("/stock");
	}

	function handleSubmit(e) {
		e.preventDefault();
		// Publishing a draft moves it to 'available'; a dress that was never
		// a draft keeps whatever status it already had (e.g. editing an
		// Available dress doesn't silently change it to something else).
		save(originalStatus === "draft" ? "available" : originalStatus);
	}

	function handleSaveDraft() {
		save("draft");
	}
</script>

<div class="topbar">
	<div class="breadcrumb">
		<a href="/stock">Stock Dresses</a> <span>/ Edit</span>
	</div>
</div>

<div class="content-area">
	<div class="scroll-area">
		{#if loading}
			<p>Loading…</p>
		{:else if loadError}
			<p class="error-text">Error: {loadError}</p>
		{:else}
			<div class="page-header">
				<div>
					<div class="page-title">Edit Stock Dress</div>
					<div class="page-meta">{name}</div>
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

				{#if saveError}
					<p class="error-text">Error: {saveError}</p>
				{/if}

				<div class="form-actions">
					<a href="/stock" class="btn-secondary">Cancel</a>
					{#if originalStatus === "draft"}
						<button type="button" class="btn-outline" onclick={handleSaveDraft} disabled={saving}>
							{saving ? "Saving…" : "Save Draft"}
						</button>
						<button type="submit" class="btn-gold" disabled={saving}>
							{saving ? "Saving…" : "Publish"}
						</button>
					{:else}
						<button type="submit" class="btn-gold" disabled={saving}>
							{saving ? "Saving…" : "Save Changes"}
						</button>
					{/if}
				</div>
			</form>
		{/if}
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
