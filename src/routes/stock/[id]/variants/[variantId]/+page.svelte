<script>
	import { page } from "$app/state";
	import { getStockDressById } from "$lib/services/stockDressesService";
	import { updateVariant } from "$lib/services/stockDressVariantsService";
	import { deleteImage, setPrimaryImage, setImagePosition } from "$lib/services/stockDressImagesService";
	import { recordMovement } from "$lib/services/stockMovementsService";
	import { Button } from "$lib/ui/button";
	import { Input } from "$lib/ui/input";
	import { Select } from "$lib/ui/select";
	import { Switch } from "$lib/ui/switch";
	import { Label } from "$lib/ui/label";
	import { Field } from "$lib/ui/field";
	import { NumberField } from "$lib/ui/number-field";
	import { ImageUploader } from "$lib/ui/image-uploader";
	import ImageIcon from "@lucide/svelte/icons/image";
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import FormSection from "../../../components/FormSection.svelte";
	import StockDressFormLayout from "../../../components/StockDressFormLayout.svelte";

	// One variant's own fields: photos, price, stock and shipping. Anything left
	// empty falls back to the dress value. Option values, title and description
	// stay on the dress.

	/** @type {any} */
	let dress = $state(null);
	/** @type {any} */
	let variant = $state(null);
	let loading = $state(true);
	/** @type {string | null} */
	let loadError = $state(null);
	let saving = $state(false);
	/** @type {string | null} */
	let saveError = $state(null);

	const blank = () => ({
		status: "active",
		priceOverride: /** @type {number | string | null} */ (null),
		compareAt: /** @type {number | string | null} */ (null),
		cost: /** @type {number | string | null} */ (null),
		trackQuantity: true,
		quantity: /** @type {number | string | null} */ (0),
		barcode: "",
		weight: /** @type {number | string | null} */ (null),
		length: /** @type {number | string | null} */ (null),
		width: /** @type {number | string | null} */ (null),
		height: /** @type {number | string | null} */ (null),
		/** @type {any[]} */
		images: [],
	});

	let form = $state(blank());
	/** What the form looked like when it was loaded, to tell what changed. */
	let loadedSnapshot = $state("");
	/** @type {any[]} */
	let loadedImages = $state([]);
	const dirty = $derived(JSON.stringify(form) !== loadedSnapshot);

	$effect(() => {
		load(page.params.id ?? "", page.params.variantId ?? "");
	});

	/** @param {string} dressId @param {string} variantId */
	async function load(dressId, variantId) {
		loading = true;
		loadError = null;
		saveError = null;
		const { data, error } = await getStockDressById(dressId);
		if (error) {
			loading = false;
			loadError = error;
			return;
		}
		const found = (data.stock_dress_variants ?? []).find(/** @param {any} v */ (v) => v.id === variantId);
		if (!found) {
			loading = false;
			loadError = "This variant does not exist.";
			return;
		}
		dress = data;
		variant = found;

		loadedImages = (data.stock_dress_images ?? [])
			.filter(/** @param {any} i */ (i) => i.variant_id === variantId)
			.sort(/** @param {any} a @param {any} b */ (a, b) => (a.position ?? 0) - (b.position ?? 0));

		form = {
			status: found.status,
			priceOverride: found.price_override,
			compareAt: found.compare_at_price,
			cost: found.cost,
			trackQuantity: found.track_quantity,
			quantity: found.quantity ?? 0,
			barcode: found.barcode ?? "",
			weight: found.weight_grams,
			length: found.length_cm,
			width: found.width_cm,
			height: found.height_cm,
			images: loadedImages.map(/** @param {any} i */ (i) => ({ ...i })),
		};
		loadedSnapshot = JSON.stringify(form);
		loading = false;
	}

	/** @param {number | string | null | undefined} value */
	const num = (value) => (value === "" || value === null || value === undefined ? null : Number(value));
	/** @param {number | string} n */
	const money = (n) => Number(n).toLocaleString();
	/** @param {string} axis */
	const axisLabel = (axis) => (axis === "color" ? "Colour" : axis.replace(/^\w/, (c) => c.toUpperCase()));

	/** @param {any} v */
	const nameOf = (v) =>
		(v.stock_dress_variant_values ?? []).map(/** @param {any} x */ (x) => x.value).join(" · ") || "Custom";

	const siblings = $derived(
		(dress?.stock_dress_variants ?? []).filter(/** @param {any} v */ (v) => v.status !== "archived"),
	);

	/** @param {any} v */
	function thumbOf(v) {
		const photos = (dress?.stock_dress_images ?? []).filter(/** @param {any} i */ (i) => i.variant_id === v.id);
		const dressPhotos = (dress?.stock_dress_images ?? []).filter(/** @param {any} i */ (i) => !i.variant_id);
		const pick = (/** @type {any[]} */ list) => list.find((i) => i.is_primary) ?? list[0];
		return (pick(photos) ?? pick(dressPhotos))?.image_url ?? null;
	}

	async function save() {
		if (!variant) return;
		saving = true;
		saveError = null;

		const barcode = form.barcode.trim();
		const { error } = await updateVariant(variant.id, {
			status: form.status,
			price_override: num(form.priceOverride),
			compare_at_price: num(form.compareAt),
			cost: num(form.cost),
			track_quantity: form.trackQuantity,
			weight_grams: num(form.weight),
			length_cm: num(form.length),
			width_cm: num(form.width),
			height_cm: num(form.height),
			// Emptying the box keeps the old barcode: it is filled in once and
			// frozen, so a blank is never what anyone means.
			...(barcode && barcode !== variant.barcode ? { barcode } : {}),
		});
		if (error) {
			saving = false;
			saveError = error;
			return;
		}

		const failures = await savePhotos();
		if (failures) {
			saving = false;
			saveError = `Saved, but the photos failed: ${failures}`;
			return;
		}

		// The count only moves through the ledger: a changed quantity is posted
		// as an adjustment for the difference, never written directly.
		const delta = (Number(form.quantity) || 0) - (variant.quantity ?? 0);
		if (form.trackQuantity && delta !== 0) {
			const { error: moveError } = await recordMovement({
				dress_id: dress.id,
				variant_id: variant.id,
				delta,
				reason: "adjustment",
				note: "Count corrected on the variant page",
			});
			if (moveError) {
				saving = false;
				saveError = `Saved, but recording the quantity change failed: ${moveError}`;
				return;
			}
		}

		saving = false;
		await load(dress.id, variant.id);
	}

	/** Removed photos, new order and primary. Returns an error message or null. */
	async function savePhotos() {
		const keptIds = new Set(form.images.map(/** @param {any} i */ (i) => i.id));
		for (const photo of loadedImages) {
			if (keptIds.has(photo.id)) continue;
			const { error } = await deleteImage(photo.id);
			if (error) return error;
		}
		for (const [position, photo] of form.images.entries()) {
			if ((loadedImages.find((l) => l.id === photo.id)?.position ?? 0) === position) continue;
			const { error } = await setImagePosition(photo.id, position);
			if (error) return error;
		}
		const wanted = form.images.find(/** @param {any} i */ (i) => i.is_primary);
		const was = loadedImages.find((i) => i.is_primary);
		if (wanted && wanted.id !== was?.id) {
			const { error } = await setPrimaryImage(dress.id, wanted.id, variant.id);
			if (error) return error;
		}
		return null;
	}

	/** @param {SubmitEvent} e */
	function handleSubmit(e) {
		e.preventDefault();
		if (dirty) save();
	}
</script>

{#if loading && !variant}
	<p class="text-muted-foreground p-12 text-sm">Loading…</p>
{:else if loadError}
	<div class="p-12">
		<p class="text-destructive text-sm">Error: {loadError}</p>
		<Button variant="outline" class="mt-4" href="/stock">Back to stock</Button>
	</div>
{:else if variant && dress}
	<form class="flex min-h-0 flex-1 flex-col" onsubmit={handleSubmit}>
		<StockDressFormLayout
			crumb="{dress.name} / {nameOf(variant)}"
			title={nameOf(variant)}
			error={saveError}
			note={dirty ? "Unsaved changes" : ""}
		>
			<div class="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
				<aside class="bg-card ring-foreground/10 flex flex-col overflow-hidden rounded-xl ring-1">
					<a
						href="/stock/{dress.id}/edit"
						class="border-border-light hover:bg-background flex items-center gap-2 border-b p-4 text-[13px] font-medium"
					>
						<ArrowLeftIcon class="size-3.5" />{dress.name}
					</a>
					<p class="text-muted-foreground px-4 pt-4 pb-2 text-xs font-medium">Variants</p>
					<nav aria-label="Variants" class="flex flex-col pb-2">
						{#each siblings as v (v.id)}
							{@const thumb = thumbOf(v)}
							<a
								href="/stock/{dress.id}/variants/{v.id}"
								aria-current={v.id === variant.id ? "page" : undefined}
								class="hover:bg-background flex items-center gap-3 px-4 py-2.5 {v.id === variant.id ? 'bg-accent shadow-[inset_2px_0_0_var(--gold)]' : ''}"
							>
								<span class="bg-[var(--bg3)] text-text-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
									{#if thumb}<img src={thumb} alt="" class="size-full object-cover" />{:else}<ImageIcon class="size-4" />{/if}
								</span>
								<span class="flex min-w-0 flex-col gap-0.5">
									<span class="truncate text-sm {v.id === variant.id ? 'font-semibold' : 'font-medium'}">{nameOf(v)}</span>
									<span class="text-muted-foreground text-xs">
										{v.track_quantity ? `${v.quantity} in stock` : "Not tracked"}
									</span>
								</span>
							</a>
						{/each}
					</nav>
				</aside>

				<div class="flex min-w-0 flex-col gap-6">
					<FormSection title="Variant">
						{#snippet action()}
							<div class="w-40">
								<Select aria-label="Status" bind:value={form.status}>
									<option value="active">Active</option>
									<option value="archived">Archived</option>
								</Select>
							</div>
						{/snippet}
						<div class="flex flex-wrap gap-2">
							{#each variant.stock_dress_variant_values ?? [] as v (v.id)}
								<span class="bg-secondary flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px]">
									<span class="text-muted-foreground">{axisLabel(v.axis)}</span>
									<span class="font-medium">{v.value}</span>
								</span>
							{:else}
								<span class="text-muted-foreground text-sm">No option values.</span>
							{/each}
						</div>
						<p class="text-muted-foreground text-[13px]">
							Option values are set on the dress. Change them from the dress page.
						</p>
					</FormSection>

					<FormSection title="Images" description="Photos of this variant only. One is the primary.">
						<ImageUploader
							bind:images={form.images}
							uploadDisabled
							uploadHint="Photo upload is not available yet. It arrives once storage is set up."
						/>
					</FormSection>

					<FormSection title="Price">
						<div class="grid gap-4 @lg:grid-cols-3">
							<Field label="Price override" for="variant-price">
								<NumberField id="variant-price" prefix="PKR" min="0" step="0.01" placeholder={money(dress.price)} bind:value={form.priceOverride} />
							</Field>
							<Field label="Compare-at price" for="variant-compare">
								<NumberField id="variant-compare" prefix="PKR" min="0" step="0.01" bind:value={form.compareAt} />
							</Field>
							<Field label="Cost" for="variant-cost">
								<NumberField
									id="variant-cost"
									prefix="PKR"
									min="0"
									step="0.01"
									placeholder={dress.cost == null ? "" : money(dress.cost)}
									bind:value={form.cost}
								/>
							</Field>
						</div>
						<p class="text-muted-foreground text-[13px]">
							An empty field uses the dress value, shown faded. This dress: price PKR {money(dress.price)}{dress.cost == null ? "" : `, cost PKR ${money(dress.cost)}`}.
						</p>
					</FormSection>

					<FormSection title="Inventory">
						<div class="flex items-start gap-3">
							<Switch id="variant-track" class="mt-px" bind:checked={form.trackQuantity} />
							<div class="flex flex-col gap-0.5">
								<Label for="variant-track" class="text-sm">Track quantity</Label>
								<p class="text-muted-foreground text-[13px]">Count this variant on the rack.</p>
							</div>
						</div>
						<div class="grid gap-4 @lg:grid-cols-3">
							<Field label="Quantity on hand" for="variant-qty" hint="A change is saved as an adjustment in the stock history.">
								<NumberField id="variant-qty" min="0" disabled={!form.trackQuantity} bind:value={form.quantity} />
							</Field>
							<Field label="SKU" for="variant-sku" hint="Set from the dress and its option values.">
								<Input id="variant-sku" value={variant.sku ?? ""} readonly class="bg-secondary font-mono text-[13px]" />
							</Field>
							<Field label="Barcode" for="variant-barcode" hint="Defaults to the SKU. Changing it breaks labels already printed.">
								<Input id="variant-barcode" bind:value={form.barcode} placeholder="Same as SKU" class="font-mono text-[13px]" />
							</Field>
						</div>
					</FormSection>

					<FormSection title="Shipping">
						<div class="grid grid-cols-2 gap-4 @lg:grid-cols-4">
							<Field label="Weight" for="variant-weight">
								<NumberField id="variant-weight" suffix="g" min="0" placeholder={dress.weight_grams == null ? "" : String(dress.weight_grams)} bind:value={form.weight} />
							</Field>
							<Field label="Length" for="variant-length">
								<NumberField id="variant-length" suffix="cm" min="0" step="0.01" placeholder={dress.length_cm == null ? "" : String(dress.length_cm)} bind:value={form.length} />
							</Field>
							<Field label="Width" for="variant-width">
								<NumberField id="variant-width" suffix="cm" min="0" step="0.01" placeholder={dress.width_cm == null ? "" : String(dress.width_cm)} bind:value={form.width} />
							</Field>
							<Field label="Height" for="variant-height">
								<NumberField id="variant-height" suffix="cm" min="0" step="0.01" placeholder={dress.height_cm == null ? "" : String(dress.height_cm)} bind:value={form.height} />
							</Field>
						</div>
						<p class="text-muted-foreground text-[13px]">
							Weight and packed size for the courier. An empty field uses the dress value.
						</p>
					</FormSection>
				</div>
			</div>

			{#snippet actions(/** @type {boolean} */ compact)}
				<Button variant="outline" size={compact ? "sm" : "lg"} type="button" disabled={!dirty || saving} onclick={() => load(dress.id, variant.id)}>
					Discard
				</Button>
				<Button size={compact ? "sm" : "lg"} type="submit" disabled={!dirty || saving}>{saving ? "Saving…" : "Save variant"}</Button>
			{/snippet}
		</StockDressFormLayout>
	</form>
{/if}
