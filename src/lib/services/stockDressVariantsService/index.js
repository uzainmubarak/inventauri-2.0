// Service layer for the `stock_dress_variants` table.
//
// NOTE: `quantity` is absent from every payload here on purpose. It is a
// cached total maintained by the stock_movements trigger — see
// stockMovementsService.js. Writing it directly would desync it from the
// ledger that explains it.

// NOTE: `sku` and `barcode` are likewise database-generated (see
// refresh_stock_variant_sku() in the migration) —
// never set it directly here. It starts null and is filled in once axis
// values are attached via stockDressVariantValuesService.

import { supabase } from "$lib/supabaseClient";

/**
 * Fetch all variants for a dress, each with its axis values.
 * @param {string} dressId
 * @returns {Promise<{ data: any[] | null, error: string | null }>}
 */
export async function listVariantsForDress(dressId) {
	const { data, error } = await supabase
		.from("stock_dress_variants")
		.select("*, stock_dress_variant_values (*)")
		.eq("dress_id", dressId)
		.order("created_at", { ascending: true });

	if (error) {
		console.error("listVariantsForDress failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * Create a bare variant shell (no axis values yet). SKU stays null until
 * stockDressVariantValuesService.setVariantAxisValue is called at least once.
 * @param {{ dress_id: string, price_override?: number }} variant
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function createVariant(variant) {
	const { data, error } = await supabase
		.from("stock_dress_variants")
		.insert(variant)
		.select()
		.single();

	if (error) {
		console.error("createVariant failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * @param {string} id
 * @param {{ price_override?: number | null, status?: string }} updates
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function updateVariant(id, updates) {
	const { data, error } = await supabase
		.from("stock_dress_variants")
		.update(updates)
		.eq("id", id)
		.select()
		.single();

	if (error) {
		console.error("updateVariant failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * Soft-delete: sets status to 'archived'. Never hard-deletes.
 * @param {string} id
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function archiveVariant(id) {
	return updateVariant(id, { status: "archived" });
}
