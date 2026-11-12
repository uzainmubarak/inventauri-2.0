<script>
	import { page } from "$app/state";
		import { getStockDressById, updateStockDressWithDetails } from "$lib/services/stockDressesService";
	import { recordMovement } from "$lib/services/stockMovementsService";
		import { optionIssues, optionsForSave, optionsFromDress } from "$lib/products/options";
	import { findDuplicateVariants, variantsForSave } from "$lib/products/variantMatrix";
	import { numOrNull } from "$lib/products/numbers";
	import StockDressFormFields from "../../components/StockDressFormFields.svelte";
	import StockDressFormLayout from "../../components/StockDressFormLayout.svelte";
	import UnsavedGuard from "../../components/UnsavedGuard.svelte";

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

	// Shown under Price after a save attempt, and gone as soon as the price is fixed.
	let triedSave = $state(false);
	const priceRequired = $derived(triedSave && status !== "draft" && !(Number(price) > 0) ? "Price must be above 0." : null);
	/** True (and the field is focused) when an active dress has no price above 0. */
	function priceMissing() {
		if (status === "draft" || Number(price) > 0) return false;
		triedSave = true;
		document.getElementById("dress-price")?.focus();
		return true;
	}


	// Snapshots of what's currently in the DB, used to diff against the
	// edited lists on save (see updateStockDressWithDetails).
	/** @type {any[]} */
	let currentImages = $state([]);
	/** @type {any[]} */
	let currentOptions = $state([]);
	/** @type {any[]} */
	let currentVariants = $state([]);

	let saving = $state(false);

	// Everything the form edits, as text. The form is unsaved while it differs
	// from the text taken when it was loaded or last saved.
	const snapshot = () =>
		JSON.stringify([name, garmentType, category, subcategory, description, notes, tags, price, compareAtPrice, cost, trackQuantity, quantity, status, madeToOrder, weightGrams, lengthCm, widthCm, heightCm, images, options, variants]);
	let baseline = $state("");
	const dirty = $derived(!loading && snapshot() !== baseline);
	/** @type {string | null} */
	let saveError = $state(null);
	// Bumped to shake the save pill when a variant link is blocked.
	let nudge = $state(0);

	$effect(() => {
		load();
	});

	/** @param {boolean} [silent] reload after a save without hiding the form */
	async function load(silent = false) {
		if (!silent) loading = true;
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
			// The variant's own primary photo (the first one if none is marked).
			image_url: ownPhoto(data, v.id),
			status: v.status,
		}));
		triedSave = false;
		baseline = snapshot();
	}

	/** @param {any} data @param {string} variantId */
	function ownPhoto(data, variantId) {
		const own = (data.stock_dress_images ?? []).filter(/** @param {any} i */ (i) => i.variant_id === variantId);
		return (own.find(/** @param {any} i */ (i) => i.is_primary) ?? own[0])?.image_url ?? null;
	}

	/** What stops the form from being saved, or null. */
	function formProblem() {
		if (!name.trim()) return "Give the dress a name.";
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
				compare_at_price: numOrNull(compareAtPrice),
				cost: numOrNull(cost),
				track_quantity: trackQuantity,
				made_to_order: madeToOrder,
				weight_grams: numOrNull(weightGrams),
				length_cm: numOrNull(lengthCm),
				width_cm: numOrNull(widthCm),
				height_cm: numOrNull(heightCm),
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
		// An empty count means no change; a typed 0 empties the stock.
		const counted = numOrNull(quantity);
		const delta = counted === null ? 0 : counted - originalQuantity;
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

		await load(true);
		saving = false;
	}

	/** What stops a save, or null. */
	function blocker() {
		const problem = formProblem();
		if (problem) return problem;
		// Any status a customer can be quoted from needs a real price. The DB
		// enforces this too; this is so the user gets a message instead of a
		// constraint name. The message sits under Price, so no sentence is returned.
		return null;
	}

	/** @param {SubmitEvent} e */
	function handleSubmit(e) {
		e.preventDefault();
		if (priceError) return;
		if (priceMissing()) return;
		const problem = blocker();
		if (problem) {
			saveError = problem;
			return;
		}
		save(status);
	}

	/**
	 * A variant opens on its own page, but the form's changes live only here.
	 * So a click on a variant link with unsaved changes does not leave or ask:
	 * it shakes the save pill instead.
	 * @param {MouseEvent} e
	 */
	function guardVariantLinks(e) {
		if (!dirty || !(e.target instanceof Element)) return;
		if (!e.target.closest('a[href*="/variants/"]')) return;
		e.preventDefault();
		e.stopPropagation();
		nudge += 1;
	}

	/** For the leave dialog: save, then report whether it worked. */
	async function saveAndLeave() {
		if (priceError || priceMissing()) return false;
		const problem = blocker();
		if (problem) {
			saveError = problem;
			return false;
		}
		await save(status);
		return !saveError;
	}

</script>

{#if loading}
	<p class="text-muted-foreground p-12 text-sm">Loading…</p>
{:else if loadError}
	<p class="text-destructive p-12 text-sm">Error: {loadError}</p>
{:else}
	<form class="flex min-h-0 flex-1 flex-col" onsubmit={handleSubmit} onclickcapture={guardVariantLinks}>
		<UnsavedGuard {dirty} onsave={saveAndLeave} />
		<StockDressFormLayout
			crumbs={[{ label: "Edit" }]}
			title={name || "Edit dress"}
			error={saveError}
			{dirty}
			{saving}
			{nudge}
			saveLabel={originalStatus === "draft" && status === "active" ? "Publish" : "Save"}
			ondiscard={() => load(true)}
		>
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
				{priceRequired}
				editing
				{dressId}
			/>

		</StockDressFormLayout>
	</form>
{/if}
