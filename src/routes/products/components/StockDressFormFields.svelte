<script>
	import { Input } from "$lib/ui/input";
	import { Textarea } from "$lib/ui/textarea";
	import { Select } from "$lib/ui/select";
	import { Combobox } from "$lib/ui/combobox";
	import { TagInput } from "$lib/ui/tag-input";
	import { NumberField } from "$lib/ui/number-field";
	import { ImageUploader } from "$lib/ui/image-uploader";
	import { Switch } from "$lib/ui/switch";
	import { Label } from "$lib/ui/label";
	import { Field } from "$lib/ui/field";
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import { computeProfit, computeMargin } from "$lib/products/pricing";
	import { normaliseTags } from "$lib/products/tags";
	import { availabilityState } from "$lib/products/availability";
	import { listGarmentTypes } from "$lib/services/stockDressesService";
	import FormSection from "./FormSection.svelte";
	import OptionsEditor from "./OptionsEditor.svelte";
	import VariantList from "./VariantList.svelte";
	import StatusBadge from "./StatusBadge.svelte";

	/**
	 * Shared field markup for both /products/new (create) and /products/[id]/edit
	 * (edit): the cards on the left and the status and summary on the right.
	 * The parent page owns all the state via bindable props and decides what
	 * "Save" means.
	 *
	 * `madeToOrder` is the dress's own flag: off, a dress with an empty rack reads as
	 * sold out; on, it stays orderable.
	 *
	 * `quantity` is the dress-level count. It only counts when the dress has no
	 * variants; with variants it is stored and hidden, and the variant
	 * quantities are what count. `editing` is true on the edit page.
	 *
	 * @type {{
	 *   name: string,
	 *   garmentType: string,
	 *   category: string,
	 *   subcategory: string,
	 *   description: string,
	 *   notes: string,
	 *   tags: string[],
	 *   price: string | number,
	 *   compareAtPrice: string | number,
	 *   cost: string | number,
	 *   trackQuantity: boolean,
	 *   quantity: string | number,
	 *   status: string,
	 *   madeToOrder: boolean,
	 *   weightGrams: string | number,
	 *   lengthCm: string | number,
	 *   widthCm: string | number,
	 *   heightCm: string | number,
	 *   images: any[],
	 *   options: any[],
	 *   variants: any[],
	 *   editing?: boolean,
 *   dressId?: string,
	 *   priceError?: string | null,
	 * }}
	 */
	let {
		name = $bindable(),
		garmentType = $bindable(),
		category = $bindable(),
		subcategory = $bindable(),
		description = $bindable(),
		notes = $bindable(),
		tags = $bindable(),
		price = $bindable(),
		compareAtPrice = $bindable(),
		cost = $bindable(),
		trackQuantity = $bindable(),
		quantity = $bindable(),
		status = $bindable(),
		madeToOrder = $bindable(),
		weightGrams = $bindable(),
		lengthCm = $bindable(),
		widthCm = $bindable(),
		heightCm = $bindable(),
		images = $bindable(),
		options = $bindable(),
		variants = $bindable(),
		editing = false,
		dressId,
		priceError = $bindable(),
	} = $props();

	let shippingOpen = $state(false);
	/** @type {string[]} */
	let garmentTypes = $state([]);

	$effect(() => {
		listGarmentTypes().then(({ data }) => {
			if (data) garmentTypes = data;
		});
	});

	// Derived, never stored — a saved copy would go stale the moment cost or
	// price changed. See docs/stock-module-schema.md.
	const profit = $derived(computeProfit(price, cost));
	const margin = $derived(computeMargin(price, cost));

	// Caught here rather than letting the database CHECK be what tells the
	// user: "violates check constraint compare_at_above_price" is not an
	// error message a person should ever see.
	const compareAtInvalid = $derived(
		compareAtPrice !== "" &&
			compareAtPrice !== null &&
			compareAtPrice !== undefined &&
			Number(compareAtPrice) <= Number(price),
	);

	$effect(() => {
		priceError = compareAtInvalid
			? "Compare-at price must be higher than the price. It is the “was” price."
			: null;
	});

	const activeVariants = $derived(variants.filter(/** @param {any} v */ (v) => v.status !== "archived"));
	const totalQuantity = $derived(
		activeVariants.length > 0
			? activeVariants.reduce(/** @param {number} sum @param {any} v */ (sum, v) => sum + (Number(v.quantity) || 0), 0)
			: Number(quantity) || 0,
	);
	const shownAs = $derived(availabilityState({ status, made_to_order: madeToOrder }, totalQuantity));

	/** @param {number | string} value */
	const money = (value) => Number(value).toLocaleString();

	const STATUSES = $derived([
		{ value: "draft", label: "Draft" },
		{ value: "active", label: "Active" },
		...(editing ? [{ value: "archived", label: "Archived" }] : []),
	]);
</script>

<div class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_316px]">
	<div class="flex min-w-0 flex-col gap-6">
		<FormSection title="Basics">
			<Field label="Name" for="dress-name">
				<Input id="dress-name" bind:value={name} />
			</Field>
			<Field label="Garment type" for="dress-type" hint="Pick an existing type or type a new one.">
				<Combobox id="dress-type" bind:value={garmentType} options={garmentTypes} placeholder="e.g. Farshi lehenga" />
			</Field>
			<div class="grid gap-4 @md:grid-cols-2">
				<Field label="Category" for="dress-category">
					<Select id="dress-category" bind:value={category}>
						<option value="party_wear">Party wear</option>
						<option value="formals">Formals</option>
						<option value="bridal">Bridal</option>
						<option value="nikkah_wear">Nikkah wear</option>
					</Select>
				</Field>
				<Field label="Subcategory" for="dress-subcategory" hint="Bridal designs only.">
					<Select id="dress-subcategory" bind:value={subcategory} disabled={category !== "bridal"}>
						<option value="">None</option>
						<option value="mehendi">Mehendi</option>
						<option value="barat">Barat</option>
						<option value="walima">Walima</option>
					</Select>
				</Field>
			</div>
			<Field label="Description" for="dress-description">
				<Textarea id="dress-description" bind:value={description} rows={3} placeholder="Shown to customers" />
			</Field>
			<Field label="Internal notes" for="dress-notes">
				<Textarea id="dress-notes" bind:value={notes} rows={2} placeholder="Staff only, never shown to a client" />
			</Field>
			<Field label="Tags" for="dress-tags" hint="Press Enter or comma to add. Duplicates are ignored.">
				<TagInput id="dress-tags" bind:value={tags} normalise={normaliseTags} />
			</Field>
		</FormSection>

		<FormSection title="Images" description="The first photo is the primary one. Drag to reorder.">
			<ImageUploader bind:images />
		</FormSection>

		<FormSection title="Pricing">
			<div class="grid gap-4 @lg:grid-cols-3">
				<Field label="Price" for="dress-price">
					<NumberField id="dress-price" prefix="PKR" min="0" step="0.01" bind:value={price} />
				</Field>
				<Field label="Compare-at price" for="dress-compare" error={compareAtInvalid ? priceError : null}>
					<NumberField
						id="dress-compare"
						prefix="PKR"
						min="0"
						step="0.01"
						placeholder="The “was” price"
						aria-invalid={compareAtInvalid}
						bind:value={compareAtPrice}
					/>
				</Field>
				<Field label="Cost" for="dress-cost" hint="Internal only.">
					<NumberField id="dress-cost" prefix="PKR" min="0" step="0.01" bind:value={cost} />
				</Field>
			</div>
			<div class="grid gap-3 @md:grid-cols-2">
				<div class="flex items-center justify-between gap-3 rounded-xl px-4 py-3 {profit === null ? 'bg-secondary' : profit >= 0 ? 'bg-green-dim text-green' : 'bg-destructive/10 text-destructive'}">
					<span class="text-[13px]">Profit</span>
					<span class="font-mono text-sm font-medium">{profit === null ? "–" : `PKR ${money(profit)}`}</span>
				</div>
				<div class="flex items-center justify-between gap-3 rounded-xl px-4 py-3 {margin === null ? 'bg-secondary' : margin >= 0 ? 'bg-green-dim text-green' : 'bg-destructive/10 text-destructive'}">
					<span class="text-[13px]">Margin</span>
					<span class="font-mono text-sm font-medium">{margin === null ? "–" : `${(margin * 100).toFixed(1)}%`}</span>
				</div>
			</div>
			<p class="text-muted-foreground text-[13px]">
				Compare-at is the struck-through “was” price and must be higher than the price. Profit and
				margin are worked out live and never saved.
			</p>
		</FormSection>

		<FormSection title="Inventory">
			<div class="flex items-start gap-3">
				<Switch id="track-quantity" class="mt-px" bind:checked={trackQuantity} />
				<div class="flex flex-col gap-0.5">
					<Label for="track-quantity" class="text-sm">Track quantity</Label>
					<p class="text-muted-foreground text-[13px]">
						Count what is on the rack. Off for pieces you never count.
					</p>
				</div>
			</div>
			{#if trackQuantity}
				<Field
					label="Quantity"
					for="dress-quantity"
					class="max-w-xs"
					hint={activeVariants.length > 0
						? "Quantity entered here is replaced by the variant quantities."
						: editing
							? "A change is saved as an adjustment in the stock history."
							: "Saved as the opening stock."}
				>
					<NumberField id="dress-quantity" min="0" bind:value={quantity} />
				</Field>
			{/if}
		</FormSection>

		<FormSection
			title="Options"
			description="Choices a customer makes when ordering, such as dupatta style. They can add to the price. They are not counted and have no SKU."
		>
			<OptionsEditor bind:options />
		</FormSection>

		<FormSection
			title="Variants"
			description="What hangs on the rack, such as size and colour. Each version is counted and gets its own SKU and barcode."
		>
			<VariantList {variants} {trackQuantity} {dressId} onChange={(v) => (variants = v)} />
		</FormSection>

		<FormSection title="Make to order">
			<div class="flex items-start gap-3">
				<Switch id="made-to-order" class="mt-px" bind:checked={madeToOrder} />
				<div class="flex flex-col gap-0.5">
					<Label for="made-to-order" class="text-sm">Offer make to order</Label>
					<p class="text-muted-foreground text-[13px]">
						{madeToOrder
							? "When the rack is empty, this design stays orderable instead of showing as sold out."
							: "When the rack is empty, this design shows as Sold out and cannot be ordered."}
					</p>
				</div>
			</div>
			{#if madeToOrder}
				<div class="border-border-light flex flex-col gap-3.5 border-t pt-[18px]">
					<div class="flex items-center justify-between gap-4">
						<span class="text-sm font-medium">Lead time</span>
						<span class="border-border text-muted-foreground flex h-6 shrink-0 items-center rounded-full border px-2.5 text-xs font-medium">Saved with orders</span>
					</div>
					<div class="grid gap-4 @md:grid-cols-2">
						<Field label="Shortest" for="lead-min">
							<NumberField id="lead-min" suffix="weeks" placeholder="2" disabled />
						</Field>
						<Field label="Longest" for="lead-max">
							<NumberField id="lead-max" suffix="weeks" placeholder="4" disabled />
						</Field>
					</div>
					<p class="text-muted-foreground text-[13px]">How long a new piece takes. Customers will see it on the dress once orders can save it.</p>
				</div>
			{/if}
		</FormSection>

		<section class="bg-card ring-foreground/10 @container rounded-xl ring-1">
			<button
				type="button"
				class="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
				aria-expanded={shippingOpen}
				aria-controls="shipping-fields"
				onclick={() => (shippingOpen = !shippingOpen)}
			>
				<span class="flex flex-col gap-0.5">
					<span class="font-serif text-xl font-medium">Shipping</span>
					<span class="text-muted-foreground text-[13px]">Optional. Only needed if your courier prices on weight or size.</span>
				</span>
				<ChevronDownIcon class="text-text-muted size-4 transition-transform {shippingOpen ? 'rotate-180' : ''}" />
			</button>
			{#if shippingOpen}
				<div id="shipping-fields" class="grid grid-cols-2 gap-4 px-6 pb-6 @lg:grid-cols-4">
					<Field label="Weight" for="dress-weight">
						<NumberField id="dress-weight" suffix="g" min="0" bind:value={weightGrams} />
					</Field>
					<Field label="Length" for="dress-length">
						<NumberField id="dress-length" suffix="cm" min="0" step="0.01" bind:value={lengthCm} />
					</Field>
					<Field label="Width" for="dress-width">
						<NumberField id="dress-width" suffix="cm" min="0" step="0.01" bind:value={widthCm} />
					</Field>
					<Field label="Height" for="dress-height">
						<NumberField id="dress-height" suffix="cm" min="0" step="0.01" bind:value={heightCm} />
					</Field>
				</div>
			{/if}
		</section>
	</div>

	<aside class="flex flex-col gap-6 xl:sticky xl:top-20">
		<FormSection title="Status" class="p-5">
			<Field label="Listing" for="dress-status">
				<Select id="dress-status" bind:value={status}>
					{#each STATUSES as opt (opt.value)}<option value={opt.value}>{opt.label}</option>{/each}
				</Select>
			</Field>
			<div class="flex items-center gap-2.5">
				<span class="text-muted-foreground text-[13px]">Shows as</span>
				<StatusBadge state={shownAs} />
			</div>
			<p class="text-muted-foreground text-[13px] leading-relaxed">
				Drafts stay off the stock list until you set them to Active.
			</p>
		</FormSection>

		<FormSection title="Summary" class="gap-1 p-5">
			<dl class="divide-border-light flex flex-col divide-y">
				<div class="flex items-center justify-between py-2.5">
					<dt class="text-muted-foreground text-sm">Price</dt>
					<dd class="font-mono text-[13px] font-medium">{Number(price) ? `PKR ${money(price)}` : "–"}</dd>
				</div>
				<div class="flex items-center justify-between py-2.5">
					<dt class="text-muted-foreground text-sm">Profit</dt>
					<dd class="font-mono text-[13px] font-medium">
						{profit === null ? "–" : `PKR ${money(profit)}`}{margin === null ? "" : ` · ${(margin * 100).toFixed(1)}%`}
					</dd>
				</div>
				<div class="flex items-center justify-between py-2.5">
					<dt class="text-muted-foreground text-sm">Variants</dt>
					<dd class="font-mono text-[13px] font-medium">{activeVariants.length}</dd>
				</div>
				<div class="flex items-center justify-between py-2.5">
					<dt class="text-muted-foreground text-sm">{editing ? "In stock" : "Opening stock"}</dt>
					<dd class="font-mono text-[13px] font-medium">{trackQuantity ? totalQuantity : "–"}</dd>
				</div>
			</dl>
		</FormSection>
	</aside>
</div>
