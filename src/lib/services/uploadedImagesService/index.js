// Service layer for the `uploaded_images` gallery and the R2 upload Worker
// (workers/image-upload). The browser never holds R2 credentials: it hashes the
// file, skips the upload when that hash is already in the gallery, and otherwise
// sends the bytes to the Worker.

import { env } from "$env/dynamic/public";
import { supabase } from "$lib/supabaseClient";

const MAX_BYTES = 10 * 1024 * 1024;

/** @returns {string} */
function workerUrl() {
	return (env.PUBLIC_IMAGE_WORKER_URL ?? "").replace(/\/$/, "");
}

/**
 * SHA-256 of a file, as lowercase hex.
 * @param {Blob} file
 */
export async function hashFile(file) {
	const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
	return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Everything in the gallery, newest first.
 * @returns {Promise<{ data: any[] | null, error: string | null }>}
 */
export async function listUploadedImages() {
	const { data, error } = await supabase
		.from("uploaded_images")
		.select("*")
		.order("created_at", { ascending: false });
	if (error) {
		console.error("listUploadedImages failed:", error.message);
		return { data: null, error: error.message };
	}
	return { data, error: null };
}

/**
 * @param {string} hash
 * @returns {Promise<{ data: any | null, error: string | null }>}
 */
export async function findUploadedImageByHash(hash) {
	const { data, error } = await supabase
		.from("uploaded_images")
		.select("*")
		.eq("content_hash", hash)
		.maybeSingle();
	if (error) return { data: null, error: error.message };
	return { data, error: null };
}

/**
 * Add a file to the gallery. A file already there (same bytes, any name) is not
 * uploaded again: the existing image comes back with `duplicate: true`.
 * @param {File} file
 * @returns {Promise<{ data: { image: any, duplicate: boolean } | null, error: string | null }>}
 */
export async function uploadImage(file) {
	if (!file.type.startsWith("image/")) return { data: null, error: `${file.name} is not an image.` };
	if (file.size > MAX_BYTES) return { data: null, error: `${file.name} is larger than 10 MB.` };
	if (!workerUrl()) return { data: null, error: "Image storage is not set up (PUBLIC_IMAGE_WORKER_URL)." };

	const hash = await hashFile(file);
	const found = await findUploadedImageByHash(hash);
	if (found.error) return { data: null, error: found.error };
	if (found.data) return { data: { image: found.data, duplicate: true }, error: null };

	let sent;
	try {
		sent = await fetch(`${workerUrl()}/images/${hash}`, {
			method: "PUT",
			headers: { "content-type": file.type },
			body: file,
		});
	} catch {
		return { data: null, error: `Could not reach image storage to upload ${file.name}.` };
	}
	if (!sent.ok) return { data: null, error: `Upload of ${file.name} failed (${sent.status}).` };
	const { key, url } = await sent.json();

	const { data, error } = await supabase
		.from("uploaded_images")
		.insert({ content_hash: hash, r2_key: key, url, file_name: file.name, content_type: file.type, size_bytes: file.size })
		.select()
		.single();
	if (error) {
		// Another upload of the same file won the race: use that row.
		const again = await findUploadedImageByHash(hash);
		if (again.data) return { data: { image: again.data, duplicate: true }, error: null };
		return { data: null, error: error.message };
	}
	return { data: { image: data, duplicate: false }, error: null };
}

/**
 * How many dress photos and option-value photos use this URL.
 * @param {string} url
 * @returns {Promise<{ data: number | null, error: string | null }>}
 */
export async function countImageUses(url) {
	const [a, b] = await Promise.all([
		supabase.from("stock_dress_images").select("id", { count: "exact", head: true }).eq("image_url", url),
		supabase.from("stock_dress_option_values").select("id", { count: "exact", head: true }).eq("image_url", url),
	]);
	const error = a.error ?? b.error;
	if (error) return { data: null, error: error.message };
	return { data: (a.count ?? 0) + (b.count ?? 0), error: null };
}

/**
 * Delete a photo from the gallery and from the R2 bucket. Refuses while a dress or
 * option still uses it. The file goes first: if that fails, the row stays.
 * @param {{ id: string, r2_key: string, url: string }} image
 * @returns {Promise<{ data: true | null, error: string | null }>}
 */
export async function deleteUploadedImage(image) {
	const uses = await countImageUses(image.url);
	if (uses.error) return { data: null, error: uses.error };
	if (uses.data) return { data: null, error: `This photo is used in ${uses.data} place${uses.data === 1 ? "" : "s"}. Remove it there first.` };

	try {
		const res = await fetch(`${workerUrl()}/images/${encodeURIComponent(image.r2_key)}`, { method: "DELETE" });
		if (!res.ok) return { data: null, error: `Could not delete the file from storage (${res.status}).` };
	} catch {
		return { data: null, error: "Could not reach image storage." };
	}
	const { error } = await supabase.from("uploaded_images").delete().eq("id", image.id);
	if (error) return { data: null, error: error.message };
	return { data: true, error: null };
}
