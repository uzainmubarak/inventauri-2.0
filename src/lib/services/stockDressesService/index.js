// Service layer for the `stock_dresses` table (F17 — Stock Dress Inventory).
// See docs/inventauri_requirements.md §7a for the full feature spec.
//
// Convention: components never call `supabase.from(...)` directly.
// Every table gets one service file exporting plain async functions.
// Each function returns { data, error } — same shape Supabase itself uses.

import { supabase } from "$lib/supabaseClient";
import {
	addImage,
	deleteImage,
	listImagesForDress,
	setImagePosition,
	setPrimaryImage,
} from "$lib/services/stockDressImagesService";
import {
	createOption,
	addOptionValue,
	deleteOption,
	deleteOptionValue,
	updateOption,
	updateOptionValue,
} from "$lib/services/stockDressOptionsService";
import { createVariant, updateVariant, archiveVariant } from "$lib/services/stockDressVariantsService";
import { removeVariantAxisValue, setVariantAxisValue } from "$lib/services/stockDressVariantValuesService";
import { recordMovement } from "$lib/services/stockMovementsService";
import { getStockSettings, nextSkuNumber } from "$lib/services/stockSettingsService";
import { cleanSku, formatDressSku, formatVariantSku } from "$lib/products/sku";

/**
 * SKU for a new variant: what the user typed, else (with autogenerate on) the dress
 * SKU plus the variant's option values, else none.
 * @param {any} settings
 * @param {{ sku: string | null }} dress
 * @param {{ sku?: string | null, axisValues: { axis: string, value: string }[] }} variant
 */
function variantSku(settings, dress, variant) {
	const typed = cleanSku(variant.sku);
	if (typed || !settings.sku_autogenerate) return typed;
	return formatVariantSku(settings, dress.sku, variant.axisValues);
}

/**
 * Fetch all stock dresses, newest first.
 * @returns {Promise<{ data: any[] | null, error: string | null }>}
 */
export async function listStockDresses() {
	// Variants come along because the catalog card needs their quantities to
	// decide what the dress reads as (in stock / made to order / sold out),
	// and their axis values for the size filter.
	const { data, error } = await supabase
		.from("stock_dresses")
		.select(
			`*,
			stock_dress_images (*),
			stock_dress_variants (id, quantity, status, price_override, stock_dress_variant_values (*))`,
		)
		.order("created_at", { ascending: false });

	if (error) {
		console.error("listStockDresses failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * Every garment type already in use, A to Z, for the form's suggestion list.
 * @returns {Promise<{ data: string[] | null, error: string | null }>}
 */
export async function listGarmentTypes() {
	const { data, error } = await supabase.from("stock_dresses").select("garment_type");

	if (error) {
		console.error("listGarmentTypes failed:", error.message);
		return { data: null, error: error.message };
	}
	const types = [...new Set(data.map(/** @param {{ garment_type: string }} d */ (d) => d.garment_type))];
	return { data: types.sort((a, b) => a.localeCompare(b)), error: null };
}

/**
 * Fetch a single stock dress by id, including its images, options (with
 * their values), and variants (with each variant's axis values), enough
 * for both the read-only detail drawer and the edit page.
 * @param {string} id
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function getStockDressById(id) {
	const { data, error } = await supabase
		.from("stock_dresses")
		.select(
			`*,
			stock_dress_images (*),
			stock_dress_options (*, stock_dress_option_values (*)),
			stock_dress_variants (*, stock_dress_variant_values (*))`,
		)
		.eq("id", id)
		.single();

	if (error) {
		console.error("getStockDressById failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * Create a new stock dress. `sku` is optional and is stored as given; generating it is
 * createStockDressWithDetails' job (see docs/settings.md).
 * @param {{ sku?: string | null, name: string, garment_type: string, category: string, subcategory?: string | null, description?: string | null, notes?: string | null, tags?: string[], price: number, compare_at_price?: number | null, cost?: number | null, track_quantity?: boolean, made_to_order?: boolean, weight_grams?: number | null, length_cm?: number | null, width_cm?: number | null, height_cm?: number | null, status?: string }} dress
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function createStockDress(dress) {
	const { data, error } = await supabase
		.from("stock_dresses")
		.insert(dress)
		.select()
		.single();

	if (error) {
		console.error("createStockDress failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * Update fields on an existing stock dress. `sku` can be edited like any other
 * field; a blank one is saved as null.
 * @param {string} id
 * @param {Partial<{ sku: string | null, name: string, garment_type: string, category: string, subcategory?: string | null, description?: string | null, notes?: string | null, tags?: string[], price: number, compare_at_price?: number | null, cost?: number | null, track_quantity?: boolean, made_to_order?: boolean, weight_grams?: number | null, length_cm?: number | null, width_cm?: number | null, height_cm?: number | null, status?: string }>} updates
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function updateStockDress(id, updates) {
	const { data, error } = await supabase
		.from("stock_dresses")
		.update("sku" in updates ? { ...updates, sku: cleanSku(updates.sku) } : updates)
		.eq("id", id)
		.select()
		.single();

	if (error) {
		console.error("updateStockDress failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * Soft-delete: sets status to 'archived' — a retired design you will never
 * make again. Never hard-deletes: variants carry movement history, and
 * stock_movements.variant_id is ON DELETE RESTRICT.
 * @param {string} id
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function archiveStockDress(id) {
	return updateStockDress(id, { status: "archived" });
}

/**
 * Give a variant exactly one own photo, or none. `existing` is the variant's saved
 * photo rows. Nothing happens when the wanted URL is already its photo.
 * @param {string} dressId
 * @param {string} variantId
 * @param {string | null | undefined} wantedUrl  undefined leaves the photos alone
 * @param {{ id: string, image_url: string }[]} [existing]
 * @returns {Promise<string | null>} an error message, or null
 */
async function syncVariantPhoto(dressId, variantId, wantedUrl, existing = []) {
	if (wantedUrl === undefined) return null;
	if (existing.length === 1 && existing[0].image_url === wantedUrl) return null;
	for (const old of existing) {
		const { error } = await deleteImage(old.id);
		if (error) return error;
	}
	if (!wantedUrl) return null;
	const { error } = await addImage({ dress_id: dressId, variant_id: variantId, image_url: wantedUrl, is_primary: true });
	return error;
}

/**
 * Create a stock dress along with its images, options, and variants in one
 * call. Inserts run in dependency order (dress -> images -> options ->
 * option values -> variant shells -> variant axis values). If any step
 * fails, the function stops and returns that error immediately — the dress
 * row (and whatever was inserted before the failure) is NOT rolled back,
 * since Supabase's REST API has no cross-table transaction support here.
 * Partial data is left in place; the caller can inspect `data.dress.id` to
 * clean up manually if needed.
 *
 * SKUs: what the user typed is kept. Otherwise, when Settings has autogenerate on, the dress
 * and each variant get a SKU built from the saved format (src/lib/products/sku). With
 * autogenerate off nothing is generated and a blank SKU stays null.
 *
 * Opening stock: a variant's `quantity` is recorded as a 'received' movement
 * (it never writes the column); `opening_quantity` does the same for a dress
 * with no variants.
 *
 * @param {{
 *   dress: { sku?: string | null, name: string, garment_type: string, category: string, subcategory?: string | null, description?: string | null, notes?: string | null, tags?: string[], price: number, compare_at_price?: number | null, cost?: number | null, track_quantity?: boolean, made_to_order?: boolean, weight_grams?: number | null, length_cm?: number | null, width_cm?: number | null, height_cm?: number | null, status?: string },
 *   images?: { image_url: string, is_primary?: boolean, caption?: string }[],
 *   options?: { name: string, values: { value: string, price_adjustment?: number }[] }[],
 *   variants?: { sku?: string | null, price_override?: number, quantity?: number, image_url?: string | null, axisValues: { axis: 'size' | 'color' | 'fabric' | 'other', value: string }[] }[],
 *   opening_quantity?: number
 * }} formData
 * @returns {Promise<{ data: { dress: any } | null, error: string | null }>}
 */
export async function createStockDressWithDetails(formData) {
	const { data: settings, error: settingsError } = await getStockSettings();
	if (settingsError) {
		return { data: null, error: `Could not read the SKU settings: ${settingsError}` };
	}

	// shortcut: a generated SKU that collides with a hand-typed one fails this save once;
	// saving again takes the next number. Upgrade to a retry loop if it ever shows up.
	let sku = cleanSku(formData.dress.sku);
	if (!sku && settings.sku_autogenerate) {
		const { data: number, error: numberError } = await nextSkuNumber();
		if (numberError) {
			return { data: null, error: `Could not get the next SKU number: ${numberError}` };
		}
		sku = formatDressSku(settings, /** @type {number} */ (number));
	}

	const { data: dress, error: dressError } = await createStockDress({ ...formData.dress, sku });
	if (dressError) {
		return { data: null, error: dressError };
	}

	for (const image of formData.images ?? []) {
		const { error } = await addImage({ ...image, dress_id: dress.id });
		if (error) {
			return { data: { dress }, error: `Dress created (${dress.sku}), but image failed: ${error}` };
		}
	}

	for (const [optionIndex, option] of (formData.options ?? []).entries()) {
		const { data: createdOption, error: optionError } = await createOption({
			dress_id: dress.id,
			name: option.name,
			position: optionIndex,
		});
		if (optionError) {
			return {
				data: { dress },
				error: `Dress created (${dress.sku}), but option "${option.name}" failed: ${optionError}`,
			};
		}
		for (const [valueIndex, value] of option.values.entries()) {
			const { error } = await addOptionValue({ ...value, position: valueIndex, option_id: createdOption.id });
			if (error) {
				return {
					data: { dress },
					error: `Dress created (${dress.sku}), but option value "${value.value}" failed: ${error}`,
				};
			}
		}
	}

	// Off means this design is never counted, so no opening stock is recorded.
	const trackQuantity = formData.dress.track_quantity !== false;

	// The dress-level count is stored even when variants exist, but the UI hides
	// it and variant quantities are what count (Shopify's behaviour).
	const dressOpening = Number(formData.opening_quantity) || 0;
	if (trackQuantity && dressOpening > 0) {
		const { error } = await recordMovement({
			dress_id: dress.id,
			delta: dressOpening,
			reason: "received",
			note: "Opening stock",
		});
		if (error) {
			return { data: { dress }, error: `Dress created (${dress.sku}), but recording opening stock failed: ${error}` };
		}
	}

	for (const variant of formData.variants ?? []) {
		const { data: createdVariant, error: variantError } = await createVariant({
			dress_id: dress.id,
			price_override: variant.price_override,
			sku: variantSku(settings, dress, variant),
		});
		if (variantError) {
			return { data: { dress }, error: `Dress created (${dress.sku}), but a variant failed: ${variantError}` };
		}
		for (const axisValue of variant.axisValues) {
			const { error } = await setVariantAxisValue({ ...axisValue, variant_id: createdVariant.id });
			if (error) {
				return {
					data: { dress },
					error: `Dress created (${dress.sku}), but variant axis value failed: ${error}`,
				};
			}
		}

		const photoError = await syncVariantPhoto(dress.id, createdVariant.id, variant.image_url);
		if (photoError) return { data: { dress }, error: `Dress created (${dress.sku}), but a variant photo failed: ${photoError}` };

		// Opening stock is a ledger entry, not a column write. Writing quantity
		// directly would leave the variant holding a number with no history
		// behind it — the exact hole the ledger exists to prevent.
		const opening = trackQuantity ? Number(variant.quantity) || 0 : 0;
		if (opening > 0) {
			const { error } = await recordMovement({
				dress_id: dress.id,
				variant_id: createdVariant.id,
				delta: opening,
				reason: "received",
				note: "Opening stock",
			});
			if (error) {
				return {
					data: { dress },
					error: `Dress created (${dress.sku}), but recording opening stock failed: ${error}`,
				};
			}
		}
	}

	return { data: { dress }, error: null };
}

/**
 * Update an existing stock dress along with its images, options, and
 * variants, diffing the edited lists against what's currently in the
 * database:
 *   - entries with an `id` already exist and are left as-is (nothing to
 *     update at the field level for images/option-values in this pass —
 *     only presence/absence is diffed)
 *   - entries without an `id` are new and get created
 *   - existing rows missing from the edited list are removed: images and
 *     option values/options are hard-deleted (no lifecycle status column on
 *     those tables), variants are archived instead (never hard-deleted,
 *     matching the rest of the schema's soft-delete convention)
 *
 * Like createStockDressWithDetails, this is NOT transactional — requests
 * run sequentially and a failure partway leaves prior steps applied. On
 * failure the returned error says which step failed so the caller can
 * decide whether to retry or investigate the partial state.
 *
 * A variant's `quantity` is only read for NEW variants (opening stock); on an
 * existing variant it is ignored, since only the ledger moves it.
 *
 * @param {string} dressId
 * @param {{
 *   dress: { name: string, garment_type: string, category: string, subcategory?: string | null, description?: string | null, notes?: string | null, tags?: string[], price: number, compare_at_price?: number | null, cost?: number | null, track_quantity?: boolean, made_to_order?: boolean, weight_grams?: number | null, length_cm?: number | null, width_cm?: number | null, height_cm?: number | null, status?: string },
 *   currentImages: { id: string, is_primary?: boolean }[],
 *   images: { id?: string, image_url: string, is_primary?: boolean }[],
 *   currentOptions: { id: string }[],
 *   options: { id?: string, name: string, values: { value: string, price_adjustment?: number }[] }[],
 *   currentVariants: { id: string, quantity?: number, stock_dress_variant_values?: { axis: string }[] }[],
 *   variants: { id?: string, sku?: string | null, price_override?: number, quantity?: number, image_url?: string | null, axisValues: { axis: 'size' | 'color' | 'fabric' | 'other', value: string }[] }[]
 * }} formData
 * @returns {Promise<{ data: { dress: any } | null, error: string | null }>}
 */
export async function updateStockDressWithDetails(dressId, formData) {
	const { data: settings, error: settingsError } = await getStockSettings();
	if (settingsError) {
		return { data: null, error: `Could not read the SKU settings: ${settingsError}` };
	}

	const { data: dress, error: dressError } = await updateStockDress(dressId, formData.dress);
	if (dressError) {
		return { data: null, error: dressError };
	}

	const keptImageIds = new Set(formData.images.filter((i) => i.id).map((i) => i.id));
	for (const existing of formData.currentImages) {
		if (!keptImageIds.has(existing.id)) {
			const { error } = await deleteImage(existing.id);
			if (error) {
				return { data: { dress }, error: `Dress saved, but removing an image failed: ${error}` };
			}
		}
	}
	for (const image of formData.images.filter((i) => !i.id)) {
		const { error } = await addImage({ ...image, dress_id: dress.id });
		if (error) {
			return { data: { dress }, error: `Dress saved, but adding an image failed: ${error}` };
		}
	}

	// Photos that were already saved keep their place and primary flag. The new
	// photos above are inserted in list order, so only saved ones need this.
	// `images` and `currentImages` hold the dress's own photos only; a variant's
	// photos are managed on its page and must never be passed in here.
	const savedImages = formData.images.filter((i) => i.id);
	for (const [position, image] of savedImages.entries()) {
		const { error } = await setImagePosition(/** @type {string} */ (image.id), position);
		if (error) {
			return { data: { dress }, error: `Dress saved, but reordering photos failed: ${error}` };
		}
	}
	const wantedPrimary = savedImages.find((i) => i.is_primary);
	const currentPrimary = formData.currentImages.find((i) => i.is_primary);
	if (wantedPrimary && wantedPrimary.id !== currentPrimary?.id) {
		const { error } = await setPrimaryImage(dress.id, /** @type {string} */ (wantedPrimary.id));
		if (error) {
			return { data: { dress }, error: `Dress saved, but changing the primary photo failed: ${error}` };
		}
	}

	const keptOptionIds = new Set(formData.options.filter((o) => o.id).map((o) => o.id));
	for (const existing of formData.currentOptions) {
		if (!keptOptionIds.has(existing.id)) {
			const { error } = await deleteOption(existing.id);
			if (error) {
				return { data: { dress }, error: `Dress saved, but removing an option failed: ${error}` };
			}
		}
	}
	for (const [optionIndex, option] of formData.options.entries()) {
		if (option.id) {
			const error = await syncSavedOption(option, optionIndex, formData.currentOptions);
			if (error) {
				return { data: { dress }, error: `Dress saved, but updating option "${option.name}" failed: ${error}` };
			}
			continue;
		}
		const { data: createdOption, error: optionError } = await createOption({
			dress_id: dress.id,
			name: option.name,
			position: optionIndex,
		});
		if (optionError) {
			return { data: { dress }, error: `Dress saved, but adding option "${option.name}" failed: ${optionError}` };
		}
		for (const [valueIndex, value] of option.values.entries()) {
			const { error } = await addOptionValue({ ...value, position: valueIndex, option_id: createdOption.id });
			if (error) {
				return { data: { dress }, error: `Dress saved, but adding an option value failed: ${error}` };
			}
		}
	}

	const trackQuantity = formData.dress.track_quantity !== false;

	const keptVariantIds = new Set(formData.variants.filter((v) => v.id).map((v) => v.id));
	for (const existing of formData.currentVariants) {
		if (!keptVariantIds.has(existing.id)) {
			const { error } = await archiveVariant(existing.id);
			if (error) {
				return { data: { dress }, error: `Dress saved, but archiving a variant failed: ${error}` };
			}
		}
	}
	/** @type {any[] | undefined} */
	let allImages;
	for (const variant of formData.variants) {
		if (variant.id) {
			// quantity is never written: a change is posted to the ledger below.
			const { error } = await updateVariant(variant.id, {
				price_override: variant.price_override,
				sku: cleanSku(variant.sku),
			});
			if (error) {
				return { data: { dress }, error: `Dress saved, but updating a variant failed: ${error}` };
			}
			const saved = formData.currentVariants.find((c) => c.id === variant.id);
			for (const axisValue of variant.axisValues) {
				const { error: axisError } = await setVariantAxisValue({ ...axisValue, variant_id: variant.id });
				if (axisError) return { data: { dress }, error: `Dress saved, but a variant's axis value failed: ${axisError}` };
			}
			for (const old of saved?.stock_dress_variant_values ?? []) {
				if (variant.axisValues.some((av) => av.axis === old.axis)) continue;
				const { error: axisError } = await removeVariantAxisValue(variant.id, /** @type {any} */ (old.axis));
				if (axisError) return { data: { dress }, error: `Dress saved, but a variant's axis value failed: ${axisError}` };
			}
			if (variant.image_url !== undefined) {
				allImages ??= (await listImagesForDress(dress.id)).data ?? [];
				const own = allImages.filter((i) => i.variant_id === variant.id);
				const photoError = await syncVariantPhoto(dress.id, variant.id, variant.image_url, own);
				if (photoError) return { data: { dress }, error: `Dress saved, but a variant's photo failed: ${photoError}` };
			}
			const delta = trackQuantity && saved ? (Number(variant.quantity) || 0) - (Number(saved.quantity) || 0) : 0;
			if (delta !== 0) {
				const { error: moveError } = await recordMovement({
					dress_id: dress.id,
					variant_id: variant.id,
					delta,
					reason: "adjustment",
					note: "Count corrected on the edit page",
				});
				if (moveError) return { data: { dress }, error: `Dress saved, but recording the quantity change failed: ${moveError}` };
			}
			continue;
		}
		const { data: createdVariant, error: variantError } = await createVariant({
			dress_id: dress.id,
			price_override: variant.price_override,
			sku: variantSku(settings, dress, variant),
		});
		if (variantError) {
			return { data: { dress }, error: `Dress saved, but adding a variant failed: ${variantError}` };
		}
		for (const axisValue of variant.axisValues) {
			const { error } = await setVariantAxisValue({ ...axisValue, variant_id: createdVariant.id });
			if (error) {
				return { data: { dress }, error: `Dress saved, but a new variant's axis value failed: ${error}` };
			}
		}

		const photoError = await syncVariantPhoto(dress.id, createdVariant.id, variant.image_url);
		if (photoError) return { data: { dress }, error: `Dress saved, but a new variant's photo failed: ${photoError}` };

		const opening = trackQuantity ? Number(variant.quantity) || 0 : 0;
		if (opening > 0) {
			const { error } = await recordMovement({
				dress_id: dress.id,
				variant_id: createdVariant.id,
				delta: opening,
				reason: "received",
				note: "Opening stock",
			});
			if (error) {
				return { data: { dress }, error: `Dress saved, but recording opening stock failed: ${error}` };
			}
		}
	}

	return { data: { dress }, error: null };
}

/**
 * Bring one saved option (its name, place and values) in line with the form.
 * Values with an id are updated if they changed, values without one are added,
 * and saved values missing from the form are removed.
 * @param {{ id?: string, name: string, values: { id?: string, value: string, price_adjustment?: number, image_url?: string | null }[] }} option
 * @param {number} position
 * @param {any[]} currentOptions
 * @returns {Promise<string | null>} an error message, or null
 */
async function syncSavedOption(option, position, currentOptions) {
	const optionId = /** @type {string} */ (option.id);
	const current = currentOptions.find((o) => o.id === optionId);
	if (current && (current.name !== option.name || (current.position ?? 0) !== position)) {
		const { error } = await updateOption(optionId, { name: option.name, position });
		if (error) return error;
	}

	/** @type {any[]} */
	const currentValues = current?.stock_dress_option_values ?? [];
	const keptValueIds = new Set(option.values.filter((v) => v.id).map((v) => v.id));
	for (const existing of currentValues) {
		if (!keptValueIds.has(existing.id)) {
			const { error } = await deleteOptionValue(existing.id);
			if (error) return error;
		}
	}
	for (const [valueIndex, value] of option.values.entries()) {
		const adjustment = value.price_adjustment ?? 0;
		if (!value.id) {
			const { error } = await addOptionValue({
				option_id: optionId,
				value: value.value,
				price_adjustment: adjustment,
				image_url: value.image_url ?? null,
				position: valueIndex,
			});
			if (error) return error;
			continue;
		}
		const before = currentValues.find((v) => v.id === value.id);
		const changed =
			before &&
			(before.value !== value.value ||
				Number(before.price_adjustment) !== Number(adjustment) ||
				(before.image_url ?? null) !== (value.image_url ?? null) ||
				(before.position ?? 0) !== valueIndex);
		if (changed) {
			const { error } = await updateOptionValue(value.id, {
				value: value.value,
				price_adjustment: adjustment,
				image_url: value.image_url ?? null,
				position: valueIndex,
			});
			if (error) return error;
		}
	}
	return null;
}
