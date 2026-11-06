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
	let description = $state("");
	let notes = $state("");
	/** @type {string[]} */
	let tags = $state([]);
	let price = $state("");
	let compareAtPrice = $state("");
	let cost = $state("");
	let trackQuantity = $state(true);
	let madeToOrder = $state(true);
	let weightGrams = $state("");
	let lengthCm = $state("");
	let widthCm = $state("");
	let heightCm = $state("");
	/** @type {any[]} */
	let images = $state([]);
	/** @type {any[]} */
	let options = $state([]);
	/** @type {any[]} */
	let variants = $state([]);
	/** @type {string | null} */
	let priceError = $state(null);

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
		description = data.description ?? "";
		notes = data.notes ?? "";
		tags = data.tags ?? [];
		price = data.price;
		compareAtPrice = data.compare_at_price ?? "";
		cost = data.cost ?? "";
		trackQuantity = data.track_quantity;
		madeToOrder = data.made_to_order;
		weightGrams = data.weight_grams ?? "";
		lengthCm = data.length_cm ?? "";
		widthCm = data.width_cm ?? "";
		heightCm = data.height_cm ?? "";
		originalStatus = data.status;

		currentImages = data.stock_dress_images ?? [];
		images = currentImages.map((img) => ({ ...img }));

		currentOptions = data.stock_dress_options ?? [];
		options = currentOptions.map(/** @param {any} o */ (o) => ({
			id: o.id,
			name: o.name,
			values: (o.stock_dress_option_values ?? []).map(/** @param {any} v */ (v) => ({ ...v })),
			newValue: "",
			newAdjustment: "",
		}));

		currentVariants = (data.stock_dress_variants ?? []).filter(
			/** @param {any} v */ (v) => v.status !== "archived",
		);
		variants = currentVariants.map(/** @param {any} v */ (v) => ({
			id: v.id,
			sku: v.sku,
			barcode: v.barcode,
			// Every axis, not just size — the schema has always supported four.
			axisValues: (v.stock_dress_variant_values ?? []).map(
				/** @param {any} av */ (av) => ({ axis: av.axis, value: av.value }),
			),
			quantity: v.quantity,
			price_override: v.price_override,
			status: v.status,
		}));
	}

	/** @param {string} status */
	function buildFormData(status) {
		return {
			dress: {
				name,
				garment_type: garmentType,
				category,
				subcategory: category === "bridal" && subcategory ? subcategory : null,
				description: description || null,
				notes: notes || null,
				tags,
				price: Number(price) || 0,
				compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
				cost: cost ? Number(cost) : null,
				track_quantity: trackQuantity,
				made_to_order: madeToOrder,
				weight_grams: weightGrams ? Number(weightGrams) : null,
				length_cm: lengthCm ? Number(lengthCm) : null,
				width_cm: widthCm ? Number(widthCm) : null,
				height_cm: heightCm ? Number(heightCm) : null,
				status,
			},
			currentImages,
			images,
			currentOptions,
			options: options.map(/** @param {any} o */ (o) => ({ id: o.id, name: o.name, values: o.values })),
			currentVariants,
			// Dropping an archived variant here is what archives it: the service
			// archives anything in currentVariants that is missing from this
			// list. Sending it with its id would mark it "kept" and the removal
			// would silently do nothing.
			variants: variants
				.filter(/** @param {any} v */ (v) => v.status !== "archived")
				.map(/** @param {any} v */ (v) => ({
					id: v.id,
					price_override: v.price_override,
					quantity: v.quantity,
					axisValues: v.axisValues ?? [],
				})),
		};
	}

	/** @param {string} status */
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

	/** @param {SubmitEvent} e */
	function handleSubmit(e) {
		e.preventDefault();
		if (priceError) return;
		const publishing = originalStatus === "draft";
		if (publishing && !(Number(price) > 0)) {
			saveError = "Set a price above zero before publishing, or keep this as a draft.";
			return;
		}
		// Publishing a draft moves it to 'active'; a dress that was never a
		// draft keeps the status it already had, so saving an edit never
		// silently changes it.
		save(publishing ? "active" : originalStatus);
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
					bind:description
					bind:notes
					bind:tags
					bind:price
					bind:compareAtPrice
					bind:cost
					bind:trackQuantity
					bind:madeToOrder
					bind:weightGrams
					bind:lengthCm
					bind:widthCm
					bind:heightCm
					bind:images
					bind:options
					bind:variants
					bind:priceError
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
