<script>
	import { untrack } from "svelte";
	import * as Table from "$lib/ui/table";
	import { Button } from "$lib/ui/button";
	import { Input } from "$lib/ui/input";
	import { Select } from "$lib/ui/select";
	import { NumberField } from "$lib/ui/number-field";
	import { TagInput } from "$lib/ui/tag-input";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import XIcon from "@lucide/svelte/icons/x";
	import { newUid } from "$lib/stock/options";
	import {
		axesOfVariants,
		findDuplicateVariants,
		generateVariantMatrix,
		variantSignature,
	} from "$lib/stock/variantMatrix";

	/**
	 * Variants are what hangs on the rack: each one is counted and gets its own
	 * SKU. They are built from axes (size, colour, fabric, other). Generate adds
	 * the combinations that are missing and replaces rows built from other axes; Add variant
	 * adds one. Anything a customer only chooses when ordering is an Option.
	 * See docs/stock-module-schema.md.
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

	// A saved dress opens with the axes its variants already use.
	/** @type {{ axis: string, values: string[] }[]} */
	let axes = $state(untrack(() => axesOfVariants(variants)));
	/** @type {string | null} */
	let matrixNotice = $state(null);

	const freeAxes = $derived(AXES.filter((a) => !axes.some((x) => x.axis === a)));
	let newAxis = $state("size");
	$effect(() => {
		if (!freeAxes.includes(newAxis) && freeAxes.length) newAxis = freeAxes[0];
	});

	/** The axis is stored as "color"; the studio writes "Colour". */
	/** @param {string} axis */
	const axisLabel = (axis) => (axis === "color" ? "Colour" : axis.replace(/^\w/, (c) => c.toUpperCase()));

	/** @param {any[]} next */
	function emit(next) {
		onChange?.(next);
	}

	/** @param {string} axis */
	function addAxis(axis) {
		if (axes.some((a) => a.axis === axis)) return;
		axes = [...axes, { axis, values: [] }];
	}

	// One step of undo: what the last destructive action replaced.
	/** @type {{ label: string, axes: { axis: string, values: string[] }[], variants: any[] } | null} */
	let undoState = $state(null);

	/** @param {string} label */
	function remember(label) {
		undoState = { label, axes: axes.map((a) => ({ axis: a.axis, values: [...a.values] })), variants: variants.map((v) => ({ ...v })) };
	}

	function undo() {
		if (!undoState) return;
		axes = undoState.axes;
		emit(undoState.variants);
		matrixNotice = null;
		undoState = null;
	}

	/** Removing an axis removes its values from the variants too. @param {number} index */
	function removeAxis(index) {
		remember(`Removed ${axisLabel(axes[index].axis)}`);
		axes = axes.filter((_, i) => i !== index);
		reconcile();
	}

	function generate() {
		remember("Generated variants");
		reconcile();
	}

	function reconcile() {
		const { variants: combinations, truncated, total } = generateVariantMatrix(
			axes.filter((a) => a.values.length).map((a) => ({ axis: a.axis, values: a.values })),
			{ max: MAX_VARIANTS },
		);
		const wanted = new Set(combinations.map(variantSignature));
		const have = new Set(variants.map((v) => variantSignature(v.axisValues ?? [])));

		// A variant that was removed and is wanted again comes back with its history.
		const shape = new Set(combinations[0]?.map((av) => av.axis));
		// A generated row built from different axes (e.g. size only, after colour was added) is
		// stale: unsaved ones go, saved ones are archived so their history stays.
		const stale = (/** @type {any} */ v) =>
			!v.manual &&
			v.status !== "archived" &&
			((v.axisValues ?? []).length !== shape.size || (v.axisValues ?? []).some((/** @type {any} */ av) => !shape.has(av.axis)));
		const kept = variants
			.filter((v) => !(stale(v) && !v.id))
			.map((v) =>
				stale(v)
					? { ...v, status: "archived" }
					: v.status === "archived" && wanted.has(variantSignature(v.axisValues ?? []))
						? { ...v, status: "active" }
						: v,
			);
		const added = combinations
			.filter((axisValues) => !have.has(variantSignature(axisValues)))
			.map((axisValues) => ({ key: newUid(), axisValues, quantity: 0, price_override: null, status: "active" }));

		matrixNotice = truncated
			? `${total} combinations would be created; showing the first ${MAX_VARIANTS}. Remove some values to generate the rest.`
			: null;
		emit([...kept, ...added]);
	}

	function addVariant() {
		emit([
			...variants,
			{
				key: newUid(),
				manual: true,
				axisValues: axes.map((a) => ({ axis: a.axis, value: "" })),
				quantity: 0,
				price_override: null,
				status: "active",
			},
		]);
	}

	/** @param {number} index */
	function removeVariant(index) {
		const variant = variants[index];
		remember(`Removed ${describe(variant)}`);
		// A saved variant may already have movements behind it, and
		// stock_movements.variant_id is ON DELETE RESTRICT. Archiving is both
		// what the schema allows and what preserves the history.
		if (variant.id) {
			emit(variants.map((v, i) => (i === index ? { ...v, status: "archived" } : v)));
			return;
		}
		emit(variants.filter((_, i) => i !== index));
	}

	/**
	 * `patch` is the new fields, or a function of the row as it is now, so two
	 * edits in a row never undo each other.
	 * @param {number} index
	 * @param {any} patch
	 */
	function updateVariant(index, patch) {
		emit(variants.map((v, i) => (i === index ? { ...v, ...(typeof patch === "function" ? patch(v) : patch) } : v)));
	}

	/** @param {any} variant @param {string} axis @param {string} value */
	function setAxisValue(variant, axis, value) {
		return variant.axisValues.map(/** @param {any} av */ (av) => (av.axis === axis ? { ...av, value } : av));
	}

	/** @param {any} variant */
	function describe(variant) {
		const values = (variant.axisValues ?? []).filter(/** @param {any} v */ (v) => v.value.trim());
		if (values.length === 0) return "Custom";
		return values.map(/** @param {any} v */ (v) => v.value).join(" · ");
	}

	const visibleVariants = $derived(variants.filter(/** @param {any} v */ (v) => v.status !== "archived"));
	const canGenerate = $derived(axes.some((a) => a.values.length > 0));
	const duplicates = $derived(findDuplicateVariants(variants));

	/** @param {any} variant */
	const rowKey = (variant) => variant.id ?? variant.key;
	// By key, not by object: an edit replaces the row object, and a second edit can
	// arrive before the table has caught up with the first.
	/** @param {any} variant */
	const indexOf = (variant) => variants.findIndex((v) => rowKey(v) === rowKey(variant));
</script>

<div class="flex flex-col gap-4">
	{#if undoState}
		<div class="bg-accent text-accent-foreground flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-[13px]">
			<span>{undoState.label}.</span>
			<span class="flex gap-1">
				<Button variant="ghost" size="sm" onclick={undo}>Undo</Button>
				<Button variant="ghost" size="icon-sm" aria-label="Dismiss" onclick={() => (undoState = null)}><XIcon /></Button>
			</span>
		</div>
	{/if}

	{#if axes.length === 0}
		<div class="border-text-muted flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-7 text-center">
			<div class="text-sm font-semibold">No variants</div>
			<p class="text-muted-foreground max-w-sm text-[13px] leading-relaxed">
				A dress with no variants holds its own count. Add size, colour or fabric to count each version
				on its own.
			</p>
			<div class="flex flex-wrap justify-center gap-2">
				{#each ["size", "color", "fabric"] as axis (axis)}
					<Button variant="outline" onclick={() => addAxis(axis)}><PlusIcon />{axisLabel(axis)}</Button>
				{/each}
				<Button variant="ghost" onclick={() => addAxis("other")}>Other</Button>
			</div>
		</div>
	{:else}
		<div class="flex flex-col gap-3">
			{#each axes as axis, ai (axis.axis)}
				<div class="flex items-center gap-3">
					<span class="w-[72px] shrink-0 text-sm font-medium">{axisLabel(axis.axis)}</span>
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
				{#if freeAxes.length}
					<div class="w-36">
						<Select aria-label="Axis to add" bind:value={newAxis}>
							{#each freeAxes as axisOption (axisOption)}
								<option value={axisOption}>{axisLabel(axisOption)}</option>
							{/each}
						</Select>
					</div>
					<Button variant="outline" onclick={() => addAxis(newAxis)}>Add axis</Button>
				{/if}
				<Button onclick={generate} disabled={!canGenerate}>Generate variants</Button>
			</div>
			<p class="text-muted-foreground text-[13px]">Generate adds the combinations that are missing and replaces rows built from other axes.</p>
			{#if matrixNotice}
				<p class="bg-accent text-accent-foreground rounded-lg px-3 py-2 text-[13px]">{matrixNotice}</p>
			{/if}
		</div>

		{#if visibleVariants.length > 0}
			<div class="border-border overflow-hidden rounded-xl border">
				<Table.Root aria-label="Variants">
					<Table.Header>
						<Table.Row class="h-10 hover:bg-transparent">
							<Table.Head>Variant</Table.Head>
							<Table.Head>SKU</Table.Head>
							<Table.Head class="w-44 text-right">Price override</Table.Head>
							{#if trackQuantity}<Table.Head class="w-28 text-right">Quantity</Table.Head>{/if}
							<Table.Head class="w-12"><span class="sr-only">Remove</span></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each visibleVariants as variant (rowKey(variant))}
							{@const i = indexOf(variant)}
							<Table.Row class="h-14 {variant.manual ? 'bg-background' : ''}">
								<Table.Cell class="px-3">
									{#if variant.manual}
										<div class="flex gap-2">
											{#each variant.axisValues as av (av.axis)}
												<Input
													class="h-8 w-24 text-[13px]"
													aria-label="{axisLabel(av.axis)} of the new variant"
													placeholder={axisLabel(av.axis)}
													value={av.value}
													oninput={(e) => {
														const value = e.currentTarget.value;
														updateVariant(i, (/** @type {any} */ current) => ({ axisValues: setAxisValue(current, av.axis, value) }));
													}}
												/>
											{/each}
										</div>
									{:else}
										<span class="font-medium">{describe(variant)}</span>
									{/if}
								</Table.Cell>
								<Table.Cell class="px-3">
									<Input
										class="h-8 w-44 font-mono text-xs"
										aria-label="SKU for {describe(variant)}"
										placeholder="Auto"
										value={variant.sku ?? ""}
										oninput={(e) => updateVariant(i, { sku: e.currentTarget.value })}
									/>
								</Table.Cell>
								<Table.Cell class="px-3">
									<NumberField
										class="ml-auto h-8 w-40"
										prefix="PKR"
										min="0"
										step="0.01"
										aria-label="Price override for {describe(variant)}"
										placeholder="Dress price"
										value={variant.price_override}
										oninput={(e) =>
											updateVariant(i, { price_override: e.currentTarget.value ? Number(e.currentTarget.value) : null })}
									/>
								</Table.Cell>
								{#if trackQuantity}
									<Table.Cell class="px-3 text-right">
										{#if !variant.id}
											<NumberField
												class="ml-auto h-8 w-24"
												min="0"
												aria-label="Quantity of {describe(variant)}"
												value={variant.quantity ?? 0}
												oninput={(e) => updateVariant(i, { quantity: e.currentTarget.value ? Number(e.currentTarget.value) : 0 })}
											/>
										{:else}
											<span class="font-mono text-[13px]" title="Change it from the variant's own page">{variant.quantity ?? 0}</span>
										{/if}
									</Table.Cell>
								{/if}
								<Table.Cell class="px-1">
									<Button variant="ghost" size="icon" aria-label="Remove {describe(variant)}" onclick={() => removeVariant(i)}>
										<XIcon />
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		{:else}
			<p class="text-muted-foreground text-sm">No variants yet. Generate them from the axes above, or add one.</p>
		{/if}

		{#if duplicates.length}
			<p class="text-destructive text-[13px]" role="alert">
				{duplicates.join(", ")} {duplicates.length === 1 ? "is" : "are"} listed more than once. Remove the repeats before saving.
			</p>
		{/if}

		<div class="flex flex-wrap items-center justify-between gap-3">
			<Button variant="outline" onclick={addVariant}><PlusIcon />Add variant</Button>
			<span class="text-muted-foreground text-[13px]">
				{#if trackQuantity}A new variant's quantity is its opening stock; change it later from the variant's page.{/if}
				Leave the price override empty to use the dress price.
			</span>
		</div>
	{/if}
</div>
