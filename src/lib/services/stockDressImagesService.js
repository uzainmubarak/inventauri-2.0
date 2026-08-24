// Service layer for the `stock_dress_images` table (F17).
// See docs/inventauri_requirements.md §7a.

import { supabase } from "$lib/supabaseClient";

/**
 * Fetch all images for a dress, ordered by sort position.
 * @param {string} dressId
 * @returns {Promise<{ data: any[] | null, error: string | null }>}
 */
export async function listImagesForDress(dressId) {
	const { data, error } = await supabase
		.from("stock_dress_images")
		.select("*")
		.eq("dress_id", dressId)
		.order("position", { ascending: true });

	if (error) {
		console.error("listImagesForDress failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * Add an image (URL only — no file upload in this pass, see design spec).
 * @param {{ dress_id: string, image_url: string, is_primary?: boolean, caption?: string, position?: number }} image
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function addImage(image) {
	const { data, error } = await supabase
		.from("stock_dress_images")
		.insert(image)
		.select()
		.single();

	if (error) {
		console.error("addImage failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * Mark one image as primary. The DB has a unique partial index enforcing
 * only one primary per dress, so the old primary must be cleared first.
 * @param {string} dressId
 * @param {string} imageId
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function setPrimaryImage(dressId, imageId) {
	const { error: clearError } = await supabase
		.from("stock_dress_images")
		.update({ is_primary: false })
		.eq("dress_id", dressId)
		.eq("is_primary", true);

	if (clearError) {
		console.error("setPrimaryImage (clear) failed:", clearError.message);
		return { data: null, error: clearError.message };
	}

	const { data, error } = await supabase
		.from("stock_dress_images")
		.update({ is_primary: true })
		.eq("id", imageId)
		.select()
		.single();

	if (error) {
		console.error("setPrimaryImage (set) failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * @param {string} imageId
 * @returns {Promise<{ data: null, error: string | null }>}
 */
export async function deleteImage(imageId) {
	const { error } = await supabase.from("stock_dress_images").delete().eq("id", imageId);

	if (error) {
		console.error("deleteImage failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data: null, error: null };
}
