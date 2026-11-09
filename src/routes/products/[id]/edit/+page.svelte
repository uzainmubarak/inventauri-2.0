<script>
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { getStockDressById, updateStockDressWithDetails } from "$lib/services/stockDressesService";
	import { recordMovement } from "$lib/services/stockMovementsService";
	import { Button } from "$lib/ui/button";
	import { optionIssues, optionsForSave, optionsFromDress } from "$lib/products/options";
	import { findDuplicateVariants, variantsForSave } from "$lib/products/variantMatrix";
	import StockDressFormFields from "../../components/StockDressFormFields.svelte";
	import StockDressFormLayout from "../../components/StockDressFormLayout.svelte";

	const dressId = page.params.id;

	let loading = $state(true);
	/** @type {string | null} */
	let loadError = $state(null);
	/** @type {string | null} */
	let originalStatus = $state(null);
	let originalQuantity = $state(0);

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
	let quantity = $state(0);
	let status = $state("active");
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
	/** @type {any[]} */
	let currentImages = $state([]);
	/** @type {any[]} */
	let currentOptions = $state([]);
	/** @type {any[]} */
	let currentVariants = $state([]);

	let saving = $state(false);
	/** @type {string | null} */
	let saveError = $state(null);

	$effect(() => {
		load();
	});

	async function load() {
		loading = true;
		loadError = null;
		const { data, error } = await getStockDressById(dressId ?? "");
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
		quantity = data.quantity ?? 0;
		originalQuantity = data.quantity ?? 0;
		madeToOrder = data.made_to_order;
		weightGrams = data.weight_grams ?? "";
		lengthCm = data.length_cm ?? "";
		widthCm = data.width_cm ?? "";
		heightCm = data.height_cm ?? "";
		originalStatus = data.status;
		status = data.status;

		// The dress's own photos only. A variant's photos live on its page, and
		// the save below deletes any saved photo missing from this list.
		currentImages = (data.stock_dress_images ?? [])
			.filter(/** @param {any} i */ (i) => !i.variant_id)
			.sort(/** @param {any} a @param {any} b */ (a, b) => (a.position ?? 0) - (b.position ?? 0));
		images = currentImages.map(/** @param {any} img */ (img) => ({ ...img }));

		currentOptions = data.stock_dress_options ?? [];
		currentVariants = (data.stock_dress_variants ?? []).filter(
			/** @param {any} v */ (v) => v.status !== "archived",
		);
		options = optionsFromDress(data);
		variants = currentVariants.map(/** @param {any} v */ (v) => ({
			id: v.id,
			sku: v.sku,
			barcode: v.barcode,
			// Every axis, not just size: the schema has always supported four.
			axisValues: (v.stock_dress_variant_values ?? []).map(
				/** @param {any} av */ (av) => ({ axis: av.axis, value: av.value }),
			),
			quantity: v.quantity,
			price_override: v.price_override,
			status: v.status,
		}));
	}

	/** What stops the form from being saved, or null. */
	function formProblem() {
		if (optionIssues(options).some(Boolean)) return "Fix the options marked in red first.";
		const duplicates = findDuplicateVariants(variants);
		if (duplicates.length) return `${duplicates.join(", ")} is listed more than once among the variants.`;
		return null;
	}

	/** @param {string} target */
	function buildFormData(target) {
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
				status: target,
			},
			currentImages,
			images,
			currentOptions,
			options: optionsForSave(options),
			currentVariants,
			variants: variantsForSave(variants),
		};
	}

	/** @param {string} target */
	async function save(target) {
		saving = true;
		saveError = null;

		const { error } = await updateStockDressWithDetails(dressId ?? "", buildFormData(target));
		if (error) {
			saving = false;
			saveError = error;
			return;
		}

		// The count only moves through the ledger, so a changed quantity is
		// posted as an adjustment for the difference, never written directly.
		const delta = (Number(quantity) || 0) - originalQuantity;
		if (trackQuantity && delta !== 0) {
			const { error: moveError } = await recordMovement({
				dress_id: dressId ?? "",
				delta,
				reason: "adjustment",
				note: "Count corrected on the edit page",
			});
			if (moveError) {
				saving = false;
				saveError = `Saved, but recording the quantity change failed: ${moveError}`;
				return;
			}
		}

		saving = false;
		goto("/products");
	}

	/** @param {SubmitEvent} e */
	function handleSubmit(e) {
		e.preventDefault();
		if (priceError) return;
		const problem = formProblem();
		if (problem) {
			saveError = problem;
			return;
		}
		// Any status a customer can be quoted from needs a real price. The DB
		// enforces this too; this is so the user gets a sentence instead of a
		// constraint name.
		if (status !== "draft" && !(Number(price) > 0)) {
			saveError = "Set a price above zero before saving a published dress.";
			return;
		}
		save(status);
	}

	function handleSaveDraft() {
		if (priceError) return;
		const problem = formProblem();
		if (problem) {
			saveError = problem;
			return;
		}
		save("draft");
	}
</script>

{#if loading}
	<p class="text-muted-foreground p-12 text-sm">Loading…</p>
{:else if loadError}
	<p class="text-destructive p-12 text-sm">Error: {loadError}</p>
{:else}
	<form class="flex min-h-0 flex-1 flex-col" onsubmit={handleSubmit}>
		<StockDressFormLayout crumbs={[{ label: "Edit" }]} title={name || "Edit dress"} error={saveError}>
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
				bind:quantity
				bind:status
				bind:madeToOrder
				bind:weightGrams
				bind:lengthCm
				bind:widthCm
				bind:heightCm
				bind:images
				bind:options
				bind:variants
				bind:priceError
				editing
				{dressId}
			/>

			{#snippet actions(/** @type {boolean} */ compact)}
				<Button variant="outline" size={compact ? "sm" : "lg"} href="/products">Cancel</Button>
				{#if originalStatus === "draft"}
					<Button variant="secondary" size={compact ? "sm" : "lg"} type="button" onclick={handleSaveDraft} disabled={saving}>
						{saving ? "Saving…" : "Save draft"}
					</Button>
				{/if}
				<Button size={compact ? "sm" : "lg"} type="submit" disabled={saving}>
					{saving ? "Saving…" : originalStatus === "draft" && status === "active" ? "Publish" : "Save changes"}
				</Button>
			{/snippet}
		</StockDressFormLayout>
	</form>
{/if}
