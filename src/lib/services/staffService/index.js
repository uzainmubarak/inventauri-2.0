// Service layer for the `staff` table.
//
// Convention: components never call `supabase.from(...)` directly.
// Every table gets one service file exporting plain async functions.
// Each function returns { data, error } — same shape Supabase itself uses —
// so calling code (a .svelte file's $effect) always handles errors the same way.
//
// This mirrors the pattern from the earlier inventauri Svelte prototype
// (inventoryService.js, orderService.js) — same shape, continued here.

import { supabase } from "$lib/supabaseClient";

/**
 * Fetch all staff rows, ordered by name.
 * @returns {Promise<{ data: any[] | null, error: string | null }>}
 */
export async function listStaff() {
	const { data, error } = await supabase
		.from("staff")
		.select("*")
		.order("name", { ascending: true });

	if (error) {
		console.error("listStaff failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * Fetch a single staff row by id.
 * @param {string} id
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function getStaffById(id) {
	const { data, error } = await supabase
		.from("staff")
		.select("*")
		.eq("id", id)
		.single();

	if (error) {
		console.error("getStaffById failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}
