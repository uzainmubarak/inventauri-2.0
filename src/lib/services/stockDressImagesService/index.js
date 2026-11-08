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
 *
 * TODO(security): image_url is unvalidated free text that is rendered
 * directly into <img src> (StockDressCard, StockDressDrawer). A staff
 * account can therefore point other staff browsers at an arbitrary host,
 * leaking IPs/timing and enabling CSRF against GET endpoints. Not an XSS
 * vector — <img src> does not execute javascript:/data: URLs.
 *
 * Fix when R2 upload lands: validate here with new URL(), require
 * protocol === 'https:' and an exact match on the R2 bucket hostname,
 * reject (don't strip) anything else, and mirror it as a CHECK constraint.
 * Deferred because there is no bucket origin configured to allowlist yet.
 *
 * @param {{ dress_id: string, variant_id?: string | null, image_url: string, is_primary?: boolean, caption?: string, position?: number }} image
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
 * one primary per dress photo set and one per variant, so the old primary in
 * the same scope must be cleared first. `variantId` null means the dress's
 * own photos; a variant's photos are a separate set.
 * @param {string} dressId
 * @param {string} imageId
 * @param {string | null} [variantId]
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function setPrimaryImage(dressId, imageId, variantId = null) {
	const clear = supabase
		.from("stock_dress_images")
		.update({ is_primary: false })
		.eq("dress_id", dressId)
		.eq("is_primary", true);
	const { error: clearError } = await (variantId
		? clear.eq("variant_id", variantId)
		: clear.is("variant_id", null));

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
 * Move a photo to a place in its list (0 is first).
 * @param {string} imageId
 * @param {number} position
 * @returns {Promise<{ data: null, error: string | null }>}
 */
export async function setImagePosition(imageId, position) {
	const { error } = await supabase.from("stock_dress_images").update({ position }).eq("id", imageId);

	if (error) {
		console.error("setImagePosition failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data: null, error: null };
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
