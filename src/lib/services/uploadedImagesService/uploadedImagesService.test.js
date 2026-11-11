// Integration tests — hit the LOCAL Supabase stack (see vitest.config.js). The R2 Worker is stubbed.
import { describe, it, expect, afterEach, vi } from "vitest";
import { supabase } from "$lib/supabaseClient";
import { hashFile, uploadImage as upload, listUploadedImages, deleteUploadedImage } from "./index.js";

// Tests read results directly; the real return type allows null.
const uploadImage = /** @type {(f: File) => Promise<{ data: any, error: any }>} */ (upload);

vi.mock("$env/dynamic/public", () => ({ env: { PUBLIC_IMAGE_WORKER_URL: "https://worker.test" } }));

const made = /** @type {string[]} */ ([]);
afterEach(async () => {
	vi.unstubAllGlobals();
	await supabase.from("uploaded_images").delete().in("id", made.splice(0));
});

/** A tiny unique "image" so every run hashes differently. */
const png = () => new File([`img-${Math.random()}`], "farshi.png", { type: "image/png" });

const realFetch = globalThis.fetch;

/** Pretend to be the Worker (PUT stores, DELETE removes); everything else, like Supabase, goes through. */
function stubWorker(status = 200) {
	const calls = /** @type {{ method: string, url: string }[]} */ ([]);
	vi.stubGlobal("fetch", async (/** @type {any} */ url, /** @type {any} */ init) => {
		if (!String(url).startsWith("https://worker.test")) return realFetch(url, init);
		calls.push({ method: init.method, url });
		const hash = String(url).split("/").pop();
		return new Response(JSON.stringify({ key: `${hash}.png`, url: `https://cdn.test/${hash}.png` }), { status });
	});
	return calls;
}

describe("uploadImage", () => {
	it("uploads a new file once and reuses it the second time", async () => {
		const calls = stubWorker();
		const file = png();
		const first = await uploadImage(file);
		expect(first.error).toBeNull();
		expect(first.data?.duplicate).toBe(false);
		made.push(first.data.image.id);

		const again = await uploadImage(new File([await file.arrayBuffer()], "renamed.png", { type: "image/png" }));
		expect(again.data?.duplicate).toBe(true);
		expect(again.data?.image.id).toBe(first.data.image.id);
		expect(calls).toHaveLength(1);
	});

	it("rejects non-images and oversize files before any request", async () => {
		const calls = stubWorker();
		expect((await uploadImage(new File(["x"], "a.txt", { type: "text/plain" }))).error).toMatch(/not an image/);
		const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
		expect((await uploadImage(big)).error).toMatch(/10 MB/);
		expect(calls).toHaveLength(0);
	});

	it("keeps the gallery row out when the Worker fails", async () => {
		stubWorker(500);
		const file = png();
		const hash = await hashFile(file);
		expect((await uploadImage(file)).error).toMatch(/failed/);
		const { data } = await listUploadedImages();
		expect(data?.some((i) => i.content_hash === hash)).toBe(false);
	});
});

describe("deleteUploadedImage", () => {
	it("removes the file from storage and the row", async () => {
		const calls = stubWorker();
		const { data } = await uploadImage(png());
		const res = await deleteUploadedImage(data.image);
		expect(res.error).toBeNull();
		expect(calls.at(-1)).toMatchObject({ method: "DELETE" });
		const { data: rows } = /** @type {{ data: any[] }} */ (await listUploadedImages());
		expect(rows.some((r) => r.id === data.image.id)).toBe(false);
	});

	it("refuses while a dress photo uses it", async () => {
		const calls = stubWorker();
		const { data } = await uploadImage(png());
		made.push(data.image.id);
		const { data: dress } = /** @type {{ data: any }} */ (await supabase
			.from("stock_dresses")
			.insert({ name: "Image test", garment_type: "Farshi Lehenga", category: "bridal", price: 1 })
			.select()
			.single());
		await supabase.from("stock_dress_images").insert({ dress_id: dress.id, image_url: data.image.url });

		const res = await deleteUploadedImage(data.image);
		expect(res.error).toMatch(/used in 1 place/);
		expect(calls.some((c) => c.method === "DELETE")).toBe(false);
		await supabase.from("stock_dresses").delete().eq("id", dress.id);
	});
});
