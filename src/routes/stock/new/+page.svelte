<script>
	import { goto } from "$app/navigation";
	import { createStockDressWithDetails } from "$lib/services/stockDressesService";
	import { Button } from "$lib/ui/button";
	import { optionIssues, optionsForSave, variantsForSave } from "$lib/stock/optionVariants";
	import StockDressFormFields from "../components/StockDressFormFields.svelte";
	import StockDressFormLayout from "../components/StockDressFormLayout.svelte";

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
	// On by default, as in the database: the same design can be made again.
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
	let saving = $state(false);
	/** @type {string | null} */
	let error = $state(null);

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
			images,
			options: optionsForSave(options),
			variants: variantsForSave(price, options, variants),
			opening_quantity: Number(quantity) || 0,
		};
	}

	/** @param {string} target */
	async function save(target) {
		saving = true;
		error = null;

		const { error: createError } = await createStockDressWithDetails(buildFormData(target));

		saving = false;
		if (createError) {
			error = createError;
			return;
		}
		goto("/stock");
	}

	/** @param {SubmitEvent} e */
	function handleSubmit(e) {
		e.preventDefault();
		if (priceError) return;
		if (optionIssues(options).some(Boolean)) {
			error = "Fix the options marked in red first.";
			return;
		}
		// Anything a customer could be quoted from needs a real price. Drafts
		// are explicitly allowed to be incomplete.
		if (status !== "draft" && !(Number(price) > 0)) {
			error = "Set a price above zero before creating this dress, or save it as a draft.";
			return;
		}
		save(status);
	}

	function handleSaveDraft() {
		// A draft is allowed to be incomplete, so it skips the price rule.
		if (priceError) return;
		if (optionIssues(options).some(Boolean)) {
			error = "Fix the options marked in red first.";
			return;
		}
		save("draft");
	}
</script>

<form class="flex min-h-0 flex-1 flex-col" onsubmit={handleSubmit}>
	<StockDressFormLayout crumb="Add dress" title="Add dress" {error}>
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
		/>

		{#snippet actions(/** @type {boolean} */ compact)}
			<Button variant="outline" size={compact ? "sm" : "lg"} href="/stock">Cancel</Button>
			<Button variant="secondary" size={compact ? "sm" : "lg"} type="button" onclick={handleSaveDraft} disabled={saving}>
				{saving ? "Saving…" : "Save draft"}
			</Button>
			<Button size={compact ? "sm" : "lg"} type="submit" disabled={saving}>{saving ? "Saving…" : "Create dress"}</Button>
		{/snippet}
	</StockDressFormLayout>
</form>
