// Service layer for the `stock_dress_variants` table.
//
// NOTE: `quantity` is absent from every payload here on purpose. It is a
// cached total maintained by the stock_movements trigger — see
// stockMovementsService.js. Writing it directly would desync it from the
// ledger that explains it.

// NOTE: `sku` is an input. The user types it or the dress service generates it
// from the saved format (docs/settings.md); the database never builds one.
// A blank `barcode` takes the SKU in a database trigger and is then frozen.

import { supabase } from "$lib/supabaseClient";
import { cleanSku } from "$lib/stock/sku";

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
 * Create a bare variant shell (axis values are attached afterwards). `sku` is stored as given.
 * @param {{ dress_id: string, sku?: string | null, price_override?: number }} variant
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
 * @param {{ sku?: string | null, price_override?: number | null, compare_at_price?: number | null, cost?: number | null, track_quantity?: boolean, barcode?: string | null, weight_grams?: number | null, length_cm?: number | null, width_cm?: number | null, height_cm?: number | null, status?: string }} updates
 *   — a null on any price, cost or shipping field means "use the dress value"
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function updateVariant(id, updates) {
	const { data, error } = await supabase
		.from("stock_dress_variants")
		.update("sku" in updates ? { ...updates, sku: cleanSku(updates.sku) } : updates)
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
