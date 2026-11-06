// Service layer for `stock_dress_variant_values` (F17). Inserting/updating/
// deleting a row here is what triggers refresh_stock_variant_sku() in the
// database — the parent variant's SKU is recomputed automatically as a side
// effect. Callers never construct SKU strings themselves.

import { supabase } from "$lib/supabaseClient";

/**
 * Set (create or replace) one axis value on a variant, e.g. axis='size',
 * value='M'. Because stock_dress_variant_values has a UNIQUE(variant_id, axis)
 * constraint, this upserts on that pair.
 * @param {{ variant_id: string, axis: 'size' | 'color' | 'fabric' | 'other', value: string }} axisValue
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function setVariantAxisValue(axisValue) {
	const { data, error } = await supabase
		.from("stock_dress_variant_values")
		.upsert(axisValue, { onConflict: "variant_id,axis" })
		.select()
		.single();

	if (error) {
		console.error("setVariantAxisValue failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * @param {string} variantId
 * @param {'size' | 'color' | 'fabric' | 'other'} axis
 * @returns {Promise<{ data: null, error: string | null }>}
 */
export async function removeVariantAxisValue(variantId, axis) {
	const { error } = await supabase
		.from("stock_dress_variant_values")
		.delete()
		.eq("variant_id", variantId)
		.eq("axis", axis);

	if (error) {
		console.error("removeVariantAxisValue failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data: null, error: null };
}
