<script>
	import * as Table from "$lib/ui/table";
	import { NumberField } from "$lib/ui/number-field";
	import { autoPrice } from "$lib/stock/optionVariants";

	/**
	 * The variants the options add up to. Nothing here adds or removes a row:
	 * change the options and the rows follow. What can be set per variant is its
	 * price (empty means dress price plus option adjustments) and, for a new
	 * variant, its opening quantity.
	 *
	 * Props: `variants`, `options`, `price` (the dress price), `trackQuantity`,
	 * `onChange(next)`.
	 * @type {{
	 *   variants: import("$lib/stock/optionVariants").Variant[],
	 *   options: import("$lib/stock/optionVariants").Option[],
	 *   price: number | string,
	 *   trackQuantity: boolean,
	 *   onChange: (variants: import("$lib/stock/optionVariants").Variant[]) => void
	 * }}
	 */
	let { variants, options, price, trackQuantity, onChange } = $props();

	/** @param {import("$lib/stock/optionVariants").Variant} variant */
	const label = (variant) => variant.axisValues.map((av) => av.value).join(" · ") || "Custom";

	/** @param {number} index @param {Partial<import("$lib/stock/optionVariants").Variant>} patch */
	function update(index, patch) {
		onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
	}

	/** @param {string} raw */
	const numberOrNull = (raw) => (raw === "" ? null : Number(raw));
</script>

<div class="border-border overflow-hidden rounded-xl border">
	<Table.Root aria-label="Variants">
		<Table.Header>
			<Table.Row class="h-10 hover:bg-transparent">
				<Table.Head>Variant</Table.Head>
				<Table.Head>SKU</Table.Head>
				<Table.Head class="w-44 text-right">Price</Table.Head>
				{#if trackQuantity}<Table.Head class="w-28 text-right">Quantity</Table.Head>{/if}
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each variants as variant, i (variant.id ?? variant.valueUids.join("|"))}
				{@const archived = variant.status === "archived"}
				<Table.Row class="h-14 {archived ? 'opacity-60' : ''}">
					<Table.Cell class="px-3">
						<span class="flex items-center gap-2">
							<span class="font-medium {archived ? 'line-through' : ''}">{label(variant)}</span>
							{#if archived}
								<span class="bg-[var(--bg3)] text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-semibold">Archived on save</span>
							{:else if !variant.id && variants.some((v) => v.id)}
								<span class="bg-blue-dim text-blue rounded-full px-2 py-0.5 text-[11px] font-semibold">New</span>
							{/if}
						</span>
					</Table.Cell>
					<Table.Cell class="text-muted-foreground px-3 font-mono text-xs">{variant.sku ?? "Set on save"}</Table.Cell>
					<Table.Cell class="px-3">
						<NumberField
							class="ml-auto h-8 w-40"
							prefix="PKR"
							min="0"
							step="0.01"
							disabled={archived}
							aria-label="Price for {label(variant)}"
							placeholder={Number(price) ? autoPrice(price, options, variant).toLocaleString() : "Dress price"}
							value={variant.manualPrice ? variant.price_override : null}
							oninput={(e) => {
								const typed = numberOrNull(e.currentTarget.value);
								update(i, { price_override: typed, manualPrice: typed !== null });
							}}
						/>
					</Table.Cell>
					{#if trackQuantity}
						<Table.Cell class="px-3 text-right">
							{#if !variant.id}
								<NumberField
									class="ml-auto h-8 w-24"
									min="0"
									aria-label="Quantity for {label(variant)}"
									value={variant.quantity ?? 0}
									oninput={(e) => update(i, { quantity: numberOrNull(e.currentTarget.value) ?? 0 })}
								/>
							{:else}
								<span class="font-mono text-[13px]" title="Change it from the variant's own page">{variant.quantity ?? 0}</span>
							{/if}
						</Table.Cell>
					{/if}
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>
