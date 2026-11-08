// Service layer for `stock_dress_options` and `stock_dress_option_values`
// (F17). An option is a name and its values (Size: S, M, L), and each value
// can add to the price. The values a variant is built from are its axes.

import { supabase } from "$lib/supabaseClient";

/**
 * Fetch all options for a dress, each with its values, ordered by position.
 * @param {string} dressId
 * @returns {Promise<{ data: any[] | null, error: string | null }>}
 */
export async function listOptionsForDress(dressId) {
	const { data, error } = await supabase
		.from("stock_dress_options")
		.select("*, stock_dress_option_values (*)")
		.eq("dress_id", dressId)
		.order("position", { ascending: true });

	if (error) {
		console.error("listOptionsForDress failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * @param {{ dress_id: string, name: string, position?: number }} option
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function createOption(option) {
	const { data, error } = await supabase
		.from("stock_dress_options")
		.insert(option)
		.select()
		.single();

	if (error) {
		console.error("createOption failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * @param {{ option_id: string, value: string, price_adjustment?: number, position?: number }} optionValue
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function addOptionValue(optionValue) {
	const { data, error } = await supabase
		.from("stock_dress_option_values")
		.insert(optionValue)
		.select()
		.single();

	if (error) {
		console.error("addOptionValue failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * @param {string} optionId
 * @returns {Promise<{ data: null, error: string | null }>}
 */
export async function deleteOption(optionId) {
	const { error } = await supabase.from("stock_dress_options").delete().eq("id", optionId);

	if (error) {
		console.error("deleteOption failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data: null, error: null };
}

/**
 * @param {string} optionValueId
 * @returns {Promise<{ data: null, error: string | null }>}
 */
export async function deleteOptionValue(optionValueId) {
	const { error } = await supabase
		.from("stock_dress_option_values")
		.delete()
		.eq("id", optionValueId);

	if (error) {
		console.error("deleteOptionValue failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data: null, error: null };
}

/**
 * Rename an option or move it in the list.
 * @param {string} optionId
 * @param {{ name?: string, position?: number }} updates
 * @returns {Promise<{ data: null, error: string | null }>}
 */
export async function updateOption(optionId, updates) {
	const { error } = await supabase.from("stock_dress_options").update(updates).eq("id", optionId);

	if (error) {
		console.error("updateOption failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data: null, error: null };
}

/**
 * Rename a value, change what it adds to the price, or move it in the list.
 * @param {string} optionValueId
 * @param {{ value?: string, price_adjustment?: number, position?: number }} updates
 * @returns {Promise<{ data: null, error: string | null }>}
 */
export async function updateOptionValue(optionValueId, updates) {
	const { error } = await supabase
		.from("stock_dress_option_values")
		.update(updates)
		.eq("id", optionValueId);

	if (error) {
		console.error("updateOptionValue failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data: null, error: null };
}
