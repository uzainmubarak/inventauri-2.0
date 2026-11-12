<script>
	import { goto } from "$app/navigation";
	import { createStockDressWithDetails } from "$lib/services/stockDressesService";
		import { optionIssues, optionsForSave } from "$lib/products/options";
	import { findDuplicateVariants, variantsForSave } from "$lib/products/variantMatrix";
	import { numOrNull } from "$lib/products/numbers";
	import StockDressFormFields from "../components/StockDressFormFields.svelte";
	import StockDressFormLayout from "../components/StockDressFormLayout.svelte";
	import UnsavedGuard from "../components/UnsavedGuard.svelte";

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
	let trackQuantity = $state(false);
	let quantity = $state(/** @type {number | string} */ (""));
	// Only the name is required. A dress with no price yet is a draft until it has one.
	let status = $state("draft");
	// On by default, as in the database: the same design can be made again.
	let madeToOrder = $state(false);
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

	let saving = $state(false);
	/** @type {string | null} */
	let error = $state(null);

	const snapshot = () =>
		JSON.stringify([name, garmentType, category, subcategory, description, notes, tags, price, compareAtPrice, cost, trackQuantity, quantity, status, madeToOrder, weightGrams, lengthCm, widthCm, heightCm, images, options, variants]);
	// The form is unsaved while it differs from how it started.
	let baseline = $state(snapshot());
	const dirty = $derived(snapshot() !== baseline);

	function discard() {
		name = garmentType = subcategory = description = notes = price = compareAtPrice = cost = "";
		weightGrams = lengthCm = widthCm = heightCm = "";
		category = "party_wear";
		tags = [];
		trackQuantity = madeToOrder = false;
		quantity = "";
		triedSave = false;
		status = "draft";
		images = [];
		options = [];
		variants = [];
		error = null;
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
			images,
			options: optionsForSave(options),
			variants: variantsForSave(variants),
			opening_quantity: Number(quantity) || 0,
		};
	}

	/** @param {string} target */
	async function save(target) {
		saving = true;
		error = null;

		const { data: created, error: createError } = await createStockDressWithDetails(buildFormData(target));

		saving = false;
		if (createError) {
			error = createError;
			return;
		}
		baseline = snapshot();
		// Stay on the dress: the same form, now editing the saved record.
		goto(`/products/${created?.dress.id}/edit`, { replaceState: true });
	}

	/** @param {SubmitEvent} e */
	function handleSubmit(e) {
		e.preventDefault();
		if (priceError) return;
		const problem = formProblem();
		if (problem) {
			error = problem;
			return;
		}
		// Anything a customer could be quoted from needs a real price. Drafts
		// are explicitly allowed to be incomplete.
		if (priceMissing()) return;
		save(status);
	}
</script>

<form class="flex min-h-0 flex-1 flex-col" onsubmit={handleSubmit}>
	<UnsavedGuard {dirty} />
	<StockDressFormLayout
		crumbs={[{ label: "Add dress" }]}
		title="Add dress"
		{error}
		{dirty}
		{saving}
		saveLabel={status === "draft" ? "Save" : "Create dress"}
		ondiscard={discard}
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
		/>

	</StockDressFormLayout>
</form>
