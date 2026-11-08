// Service layer for `stock_settings`: the single settings row, which holds the
// SKU format today. See docs/settings.md.
// Each function returns { data, error }, like the other services.

import { supabase } from "$lib/supabaseClient";

/**
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function getStockSettings() {
	const { data, error } = await supabase.from("stock_settings").select("*").single();

	if (error) {
		console.error("getStockSettings failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * @param {Partial<{ sku_autogenerate: boolean, sku_prefix: string, sku_separator: '-' | '_' | '.', sku_digits: number }>} updates
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function updateStockSettings(updates) {
	const { data, error } = await supabase
		.from("stock_settings")
		.update(updates)
		.eq("id", true)
		.select()
		.single();

	if (error) {
		console.error("updateStockSettings failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * Next number from the shared SKU counter. Numbers can skip but never repeat.
 * @returns {Promise<{ data: number | null, error: string | null }>}
 */
export async function nextSkuNumber() {
	const { data, error } = await supabase.rpc("next_stock_sku_number");

	if (error) {
		console.error("nextSkuNumber failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data: Number(data), error: null };
}
