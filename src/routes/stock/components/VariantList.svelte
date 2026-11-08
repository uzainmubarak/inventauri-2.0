<script>
	import * as Table from "$lib/ui/table";
	import { Button } from "$lib/ui/button";
	import { Select } from "$lib/ui/select";
	import { NumberField } from "$lib/ui/number-field";
	import { TagInput } from "$lib/ui/tag-input";
	import XIcon from "@lucide/svelte/icons/x";
	import { generateVariantMatrix } from "$lib/stock/variantMatrix";

	/**
	 * Variants are the countable, SKU'd units of a design. Axes (size, colour,
	 * fabric) combine into them; anything made only once a customer asks for
	 * it is an Option instead. See docs/stock-module-schema.md.
	 *
	 * Props: `variants` (rows), `trackQuantity` (shows the Quantity column),
	 * `onChange(next)`.
	 * @type {{
	 *   variants: any[],
	 *   trackQuantity?: boolean,
	 *   onChange?: (variants: any[]) => void
	 * }}
	 */
	let { variants, trackQuantity = true, onChange } = $props();

	const AXES = ["size", "color", "fabric", "other"];
	const MAX_VARIANTS = 100;

	/** @type {{ axis: string, values: string[] }[]} */
	let axes = $state([]);
	let newAxis = $state("size");
	/** @type {string | null} */
	let matrixNotice = $state(null);

	/** The axis is stored as "color"; the studio writes "Colour". */
	/** @param {string} axis */
	const axisLabel = (axis) => (axis === "color" ? "Colour" : axis.replace(/^\w/, (c) => c.toUpperCase()));

	/** @param {any[]} next */
	function emit(next) {
		onChange?.(next);
	}

	function addAxis() {
		if (axes.some((a) => a.axis === newAxis)) return;
		axes = [...axes, { axis: newAxis, values: [] }];
		// Offer the next axis that is still free.
		newAxis = AXES.find((a) => !axes.some((x) => x.axis === a)) ?? newAxis;
	}

	/** @param {number} index */
	function removeAxis(index) {
		axes = axes.filter((_, i) => i !== index);
	}

	function generate() {
		const { variants: combinations, truncated, total } = generateVariantMatrix(
			axes.map((a) => ({ axis: a.axis, values: a.values })),
			{ max: MAX_VARIANTS },
		);

		// Existing variants are matched by their axis signature so regenerating
		// keeps their ids — and therefore their stock history — intact.
		const existing = new Map(variants.map((v) => [signature(v.axisValues ?? []), v]));

		const next = combinations.map((axisValues) => {
			const match = existing.get(signature(axisValues));
			if (match) return match;
			return { axisValues, quantity: 0, price_override: null, status: "active" };
		});

		matrixNotice = truncated
			? `${total} combinations would be created; showing the first ${MAX_VARIANTS}. Remove some values to generate the rest.`
			: null;

		emit(next);
	}

	/** @param {{axis: string, value: string}[]} axisValues */
	function signature(axisValues) {
		return [...axisValues]
			.sort((a, b) => a.axis.localeCompare(b.axis))
			.map((v) => `${v.axis}=${v.value.toLowerCase()}`)
			.join("|");
	}

	function addBlankVariant() {
		emit([...variants, { axisValues: [], quantity: 0, price_override: null, status: "active" }]);
	}

	/** @param {number} index */
	function removeVariant(index) {
		const variant = variants[index];
		// A saved variant may already have movements behind it, and
		// stock_movements.variant_id is ON DELETE RESTRICT. Archiving is both
		// what the schema allows and what preserves the history.
		if (variant.id) {
			emit(variants.map((v, i) => (i === index ? { ...v, status: "archived" } : v)));
			return;
		}
		emit(variants.filter((_, i) => i !== index));
	}

	/** @param {number} index @param {any} patch */
	function updateVariant(index, patch) {
		emit(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
	}

	/** @param {any} variant */
	function describe(variant) {
		const values = variant.axisValues ?? [];
		if (values.length === 0) return "Custom";
		return values.map(/** @param {any} v */ (v) => v.value).join(" · ");
	}

	const visibleVariants = $derived(
		variants.filter(/** @param {any} v */ (v) => v.status !== "archived"),
	);
	const canGenerate = $derived(axes.some((a) => a.values.length > 0));

	/** @param {any} variant */
	function indexOf(variant) {
		return variants.indexOf(variant);
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-3">
		{#each axes as axis, ai (axis.axis)}
			<div class="flex items-center gap-3">
				<span class="w-20 shrink-0 text-sm font-medium">{axisLabel(axis.axis)}</span>
				<TagInput
					class="flex-1"
					bind:value={axis.values}
					placeholder={axis.axis === "size" ? "Add a size, e.g. M" : `Add a ${axisLabel(axis.axis).toLowerCase()}`}
				/>
				<Button variant="ghost" size="icon" aria-label="Remove {axisLabel(axis.axis)}" onclick={() => removeAxis(ai)}>
					<XIcon />
				</Button>
			</div>
		{/each}

		<div class="flex flex-wrap items-center gap-2">
			{#if axes.length < AXES.length}
				<div class="w-36">
					<Select aria-label="Axis to add" bind:value={newAxis}>
						{#each AXES as axisOption (axisOption)}
							<option value={axisOption} disabled={axes.some((a) => a.axis === axisOption)}>
								{axisLabel(axisOption)}
							</option>
						{/each}
					</Select>
				</div>
				<Button variant="outline" onclick={addAxis}>Add axis</Button>
			{/if}
			<Button onclick={generate} disabled={!canGenerate}>Generate variants</Button>
		</div>

		{#if matrixNotice}
			<p class="bg-accent text-accent-foreground rounded-lg px-3 py-2 text-[13px]">{matrixNotice}</p>
		{/if}
	</div>

	{#if visibleVariants.length === 0}
		<p class="text-muted-foreground text-sm">
			No variants. A design you only ever make to order needs none, and a dress with no variants
			holds its own count.
		</p>
	{:else}
		<div class="border-border overflow-hidden rounded-xl border">
			<Table.Root aria-label="Variants">
				<Table.Header>
					<Table.Row class="h-10 hover:bg-transparent">
						<Table.Head>Variant</Table.Head>
						<Table.Head>SKU</Table.Head>
						<Table.Head>Barcode</Table.Head>
						<Table.Head class="text-right">Price override</Table.Head>
						{#if trackQuantity}<Table.Head class="text-right">Quantity</Table.Head>{/if}
						<Table.Head class="w-12"><span class="sr-only">Remove</span></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each visibleVariants as variant (variant)}
						<Table.Row class="h-14">
							<Table.Cell class="px-3 font-medium">{describe(variant)}</Table.Cell>
							<Table.Cell class="text-muted-foreground px-3 font-mono text-xs">{variant.sku ?? "Set on save"}</Table.Cell>
							<Table.Cell class="text-muted-foreground px-3 font-mono text-xs">{variant.barcode ?? "Same as SKU"}</Table.Cell>
							<Table.Cell class="px-3">
								<NumberField
									class="ml-auto h-8 w-36"
									prefix="PKR"
									min="0"
									step="0.01"
									aria-label="Price override for {describe(variant)}"
									placeholder="Dress price"
									value={variant.price_override}
									oninput={(e) =>
										updateVariant(indexOf(variant), {
											price_override: e.currentTarget.value ? Number(e.currentTarget.value) : null,
										})}
								/>
							</Table.Cell>
							{#if trackQuantity}
								<Table.Cell class="px-3 text-right">
									{#if !variant.id}
										<NumberField
											class="ml-auto h-8 w-24"
											min="0"
											aria-label="Opening quantity for {describe(variant)}"
											value={variant.quantity ?? 0}
											oninput={(e) =>
												updateVariant(indexOf(variant), {
													quantity: e.currentTarget.value ? Number(e.currentTarget.value) : 0,
												})}
										/>
									{:else}
										<span class="font-mono text-[13px]" title="Changed from the variant's own page">{variant.quantity ?? 0}</span>
									{/if}
								</Table.Cell>
							{/if}
							<Table.Cell class="px-1">
								<Button
									variant="ghost"
									size="icon"
									aria-label="Remove {describe(variant)}"
									onclick={() => removeVariant(indexOf(variant))}
								>
									<XIcon />
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
		<p class="text-muted-foreground text-[13px]">
			{#if trackQuantity}
				A new variant's quantity is its opening stock. After it is saved, change it from the
				variant's own page. Leave the price override empty to use the dress price.
			{:else}
				Quantity tracking is off for this dress, so nothing is counted.
			{/if}
		</p>
	{/if}

	<button
		type="button"
		class="text-muted-foreground hover:text-foreground border-border w-fit rounded-lg border border-dashed px-3 py-2 text-[13px]"
		onclick={addBlankVariant}
	>
		+ Add a variant without axes
	</button>
</div>
