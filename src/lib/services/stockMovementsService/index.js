// Service layer for the `stock_movements` table — the append-only stock ledger.
// See docs/stock-module-schema.md.
//
// Movements are the ONLY thing that may change stock_dress_variants.quantity;
// a database trigger applies each delta. Nothing here (or anywhere else) may
// UPDATE quantity directly, or the cached total stops matching its history.
//
// The table rejects UPDATE and DELETE outright — corrections are posted as a
// new 'adjustment' row. That is why this file has no update or delete function.

import { supabase } from "$lib/supabaseClient";

/**
 * Record one stock movement. Sign must match the reason; the database
 * enforces it (received/customer_return/loan_return positive,
 * sold/damaged/lost/loaned_out negative, adjustment either way).
 *
 * @param {{
 *   variant_id: string,
 *   delta: number,
 *   reason: 'received'|'sold'|'customer_return'|'damaged'|'lost'|'adjustment'|'loaned_out'|'loan_return',
 *   borrower_id?: string | null,
 *   expected_return_at?: string | null,
 *   resolves_movement_id?: string | null,
 *   note?: string | null
 * }} movement
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function recordMovement(movement) {
	const { data, error } = await supabase
		.from("stock_movements")
		.insert(movement)
		.select()
		.single();

	if (error) {
		console.error("recordMovement failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * Full movement history for one variant, oldest first — the order it reads
 * as a story ("received 3, sold 1, damaged 1").
 *
 * @param {string} variantId
 * @returns {Promise<{ data: any[] | null, error: string | null }>}
 */
export async function listMovementsForVariant(variantId) {
	const { data, error } = await supabase
		.from("stock_movements")
		.select("*")
		.eq("variant_id", variantId)
		.order("created_at", { ascending: true });

	if (error) {
		console.error("listMovementsForVariant failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * Movement history for a dress with no variants, oldest first.
 *
 * @param {string} dressId
 * @returns {Promise<{ data: any[] | null, error: string | null }>}
 */
export async function listMovementsForDress(dressId) {
	const { data, error } = await supabase
		.from("stock_movements")
		.select("*")
		.eq("dress_id", dressId)
		.order("created_at", { ascending: true });

	if (error) {
		console.error("listMovementsForDress failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}
