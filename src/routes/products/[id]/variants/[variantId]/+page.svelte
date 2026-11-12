<script>
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { numOrNull } from "$lib/products/numbers";
	import { getStockDressById } from "$lib/services/stockDressesService";
	import { archiveVariant, updateVariant } from "$lib/services/stockDressVariantsService";
	import { addImage, deleteImage, setPrimaryImage, setImagePosition } from "$lib/services/stockDressImagesService";
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
	import UnsavedGuard from "../../../components/UnsavedGuard.svelte";

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
	// Bumped to shake the save pill when a move inside this dress is blocked.
	let nudge = $state(0);

	const blank = () => ({
		priceOverride: /** @type {number | string | null} */ (null),
		compareAt: /** @type {number | string | null} */ (null),
		cost: /** @type {number | string | null} */ (null),
		trackQuantity: true,
		quantity: /** @type {number | string | null} */ (0),
		sku: "",
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
	/** Marked for deletion: nothing happens until Save variant, which archives it. */
	let deleting = $state(false);
	const dirty = $derived(deleting || JSON.stringify(form) !== loadedSnapshot);

	$effect(() => {
		load(page.params.id ?? "", page.params.variantId ?? "");
	});

	/** @param {string} dressId @param {string} variantId */
	async function load(dressId, variantId) {
		loading = true;
		loadError = null;
		saveError = null;
		deleting = false;
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
			priceOverride: found.price_override,
			compareAt: found.compare_at_price,
			cost: found.cost,
			trackQuantity: found.track_quantity,
			quantity: found.quantity ?? 0,
			sku: found.sku ?? "",
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
		const pick = (/** @type {any[]} */ list) => list.find((i) => i.is_primary) ?? list[0];
		return pick(photos)?.image_url ?? null;
	}

	async function save() {
		if (!variant) return;
		saving = true;
		saveError = null;

		if (deleting) {
			// Archived, never removed: the movements behind it keep their history.
			const { error } = await archiveVariant(variant.id);
			saving = false;
			if (error) {
				saveError = error;
				return;
			}
			deleting = false;
			loadedSnapshot = JSON.stringify(form);
			await goto(`/products/${dress.id}/edit`);
			return;
		}

		const barcode = form.barcode.trim();
		const { error } = await updateVariant(variant.id, {
			// A blank SKU is allowed (the service stores null).
			sku: form.sku,
			price_override: numOrNull(form.priceOverride),
			compare_at_price: numOrNull(form.compareAt),
			cost: numOrNull(form.cost),
			track_quantity: form.trackQuantity,
			weight_grams: numOrNull(form.weight),
			length_cm: numOrNull(form.length),
			width_cm: numOrNull(form.width),
			height_cm: numOrNull(form.height),
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
		// An empty count means no change; a typed 0 empties the stock.
		const counted = numOrNull(form.quantity);
		const delta = counted === null ? 0 : counted - (variant.quantity ?? 0);
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

	/** Added and removed photos, new order and primary. Returns an error message or null. */
	async function savePhotos() {
		const keptIds = new Set(form.images.map(/** @param {any} i */ (i) => i.id));
		for (const photo of loadedImages) {
			if (keptIds.has(photo.id)) continue;
			const { error } = await deleteImage(photo.id);
			if (error) return error;
		}
		// New photos are inserted first so they have ids for the order and primary steps.
		const photos = [];
		const justAdded = new Set();
		for (const [position, photo] of form.images.entries()) {
			if (photo.id) {
				photos.push(photo);
				continue;
			}
			const { data, error } = await addImage({
				dress_id: dress.id,
				variant_id: variant.id,
				image_url: photo.image_url,
				position,
			});
			if (error) return error;
			justAdded.add(data.id);
			photos.push({ ...photo, id: data.id });
		}
		for (const [position, photo] of photos.entries()) {
			if (justAdded.has(photo.id)) continue;
			if ((loadedImages.find((l) => l.id === photo.id)?.position ?? 0) === position) continue;
			const { error } = await setImagePosition(photo.id, position);
			if (error) return error;
		}
		const wanted = photos.find(/** @param {any} i */ (i) => i.is_primary);
		const was = loadedImages.find((i) => i.is_primary);
		if (wanted && wanted.id !== was?.id) {
			const { error } = await setPrimaryImage(dress.id, wanted.id, variant.id);
			if (error) return error;
		}
		return null;
	}

	/**
	 * Back to the dress or over to another variant stays inside this dress but
	 * would drop the unsaved changes, so it does not leave or ask: it shakes
	 * the save pill. Leaving for anywhere else gets the leave dialog.
	 * @param {MouseEvent} e
	 */
	function guardDressLinks(e) {
		if (!dirty || !dress || !(e.target instanceof Element)) return;
		if (!e.target.closest(`a[href^="/products/${dress.id}/"]`)) return;
		e.preventDefault();
		e.stopPropagation();
		nudge += 1;
	}

	/** For the leave dialog: save, then report whether it worked. */
	async function saveAndLeave() {
		await save();
		return !saveError;
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
		<Button variant="outline" class="mt-4" href="/products">Back to products</Button>
	</div>
{:else if variant && dress}
	<form class="flex min-h-0 flex-1 flex-col" onsubmit={handleSubmit} onclickcapture={guardDressLinks}>
		<UnsavedGuard {dirty} onsave={saveAndLeave} />
		<StockDressFormLayout
			crumbs={[{ label: dress.name, href: `/products/${dress.id}/edit` }, { label: nameOf(variant) }]}
			title={nameOf(variant)}
			error={saveError}
			{dirty}
			{saving}
			{nudge}
			saveLabel="Save variant"
			ondiscard={() => load(dress.id, variant.id)}
		>
			{#snippet actions()}
				{#if !deleting}
					<Button type="button" variant="outline" class="text-destructive" onclick={() => (deleting = true)}>Delete variant</Button>
				{/if}
			{/snippet}
			<div class="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
				<aside class="bg-card ring-foreground/10 flex flex-col overflow-hidden rounded-xl ring-1">
					<a
						href="/products/{dress.id}/edit"
						class="border-border-light hover:bg-background flex items-center gap-2 border-b p-4 text-[13px] font-medium"
					>
						<ArrowLeftIcon class="size-3.5" />{dress.name}
					</a>
					<p class="text-muted-foreground px-4 pt-4 pb-2 text-xs font-medium">Variants</p>
					<nav aria-label="Variants" class="flex flex-col pb-2">
						{#each siblings as v (v.id)}
							{@const thumb = thumbOf(v)}
							<a
								href="/products/{dress.id}/variants/{v.id}"
								aria-current={v.id === variant.id ? "page" : undefined}
								class="hover:bg-background flex items-center gap-3 px-4 py-2.5 {v.id === variant.id ? 'bg-accent shadow-[inset_2px_0_0_var(--gold)]' : ''}"
							>
								<span class="bg-[var(--bg3)] text-text-muted flex aspect-[3/4] h-12 shrink-0 items-center justify-center overflow-hidden rounded-lg">
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
					{#if deleting}
						<div class="bg-destructive/5 border-destructive/25 flex items-center justify-between gap-3 rounded-xl border px-4 py-3" role="status">
							<span class="flex flex-col gap-0.5">
								<span class="text-destructive text-[13px] font-medium">This variant will be deleted on save.</span>
								{#if variant.track_quantity && variant.quantity > 0}
									<span class="text-muted-foreground text-xs">Its {variant.quantity} in stock stop counting.</span>
								{/if}
							</span>
							<Button type="button" variant="link" size="sm" class="text-foreground" onclick={() => (deleting = false)}>Undo</Button>
						</div>
					{/if}
					<div class="flex min-w-0 flex-col gap-6 {deleting ? 'opacity-50' : ''}" inert={deleting}>
					<FormSection title="Variant">
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
						<ImageUploader bind:images={form.images} />
					</FormSection>

					<FormSection title="Price">
						<div class="grid gap-4 @lg:grid-cols-3">
							<Field label="Price" for="variant-price">
								<NumberField id="variant-price" prefix="PKR" min="0" step="0.01" placeholder="Dress price: {money(dress.price)}" bind:value={form.priceOverride} />
							</Field>
							<Field label="Compare-at price" for="variant-compare">
								<NumberField id="variant-compare" prefix="PKR" min="0" step="0.01" placeholder="Same as dress" bind:value={form.compareAt} />
							</Field>
							<Field label="Cost" for="variant-cost">
								<NumberField
									id="variant-cost"
									prefix="PKR"
									min="0"
									step="0.01"
									placeholder="Same as dress"
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
								<NumberField id="variant-qty" min="0" placeholder="Count" disabled={!form.trackQuantity} bind:value={form.quantity} />
							</Field>
							<Field label="SKU" for="variant-sku" hint="Leave empty for none. Changing it does not change the barcode.">
								<Input id="variant-sku" bind:value={form.sku} placeholder="No SKU" class="font-mono text-[13px]" />
							</Field>
							<Field label="Barcode" for="variant-barcode" hint="Defaults to the SKU. Changing it breaks labels already printed.">
								<Input id="variant-barcode" bind:value={form.barcode} placeholder="Same as SKU" class="font-mono text-[13px]" />
							</Field>
						</div>
					</FormSection>

					<FormSection title="Shipping">
						<div class="grid grid-cols-2 gap-4 @lg:grid-cols-4">
							<Field label="Weight" for="variant-weight">
								<NumberField id="variant-weight" suffix="g" min="0" placeholder="Same as dress" bind:value={form.weight} />
							</Field>
							<Field label="Length" for="variant-length">
								<NumberField id="variant-length" suffix="cm" min="0" step="0.01" placeholder="Same as dress" bind:value={form.length} />
							</Field>
							<Field label="Width" for="variant-width">
								<NumberField id="variant-width" suffix="cm" min="0" step="0.01" placeholder="Same as dress" bind:value={form.width} />
							</Field>
							<Field label="Height" for="variant-height">
								<NumberField id="variant-height" suffix="cm" min="0" step="0.01" placeholder="Same as dress" bind:value={form.height} />
							</Field>
						</div>
						<p class="text-muted-foreground text-[13px]">
							Weight and packed size for the courier. An empty field uses the dress value.
						</p>
					</FormSection>
					</div>
				</div>
			</div>
		</StockDressFormLayout>
	</form>
{/if}
