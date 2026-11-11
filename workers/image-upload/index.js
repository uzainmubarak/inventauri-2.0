// Cloudflare Worker in front of the R2 bucket. The browser never holds R2 keys.
//   PUT    /images/<sha256>  body = the image. Stores it as <sha256>.<ext>; no-op if present.
//   DELETE /images/<key>     removes that object.
// shortcut: no login check, only a CORS origin allowlist (which stops other websites,
// not other clients). Verify the Supabase JWT here before this is used with real data.

const MAX_BYTES = 10 * 1024 * 1024;
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

/** @param {ArrayBuffer} buf */
async function sha256(buf) {
	const d = await crypto.subtle.digest("SHA-256", buf);
	return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
	async fetch(req, env) {
		const origin = req.headers.get("origin") ?? "";
		const allowed = env.ALLOWED_ORIGINS.split(",").includes(origin);
		const cors = {
			"access-control-allow-origin": allowed ? origin : "null",
			"access-control-allow-methods": "PUT, DELETE, OPTIONS",
			"access-control-allow-headers": "content-type",
			vary: "origin",
		};
		const reply = (body, status = 200) =>
			new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

		if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
		if (!allowed) return reply({ error: "origin not allowed" }, 403);

		const m = new URL(req.url).pathname.match(/^\/images\/([^/]+)$/);
		if (!m) return reply({ error: "not found" }, 404);
		const name = decodeURIComponent(m[1]);

		if (req.method === "PUT") {
			const ext = EXT[req.headers.get("content-type") ?? ""];
			if (!ext) return reply({ error: "unsupported image type" }, 415);
			if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) return reply({ error: "too large" }, 413);
			const body = await req.arrayBuffer();
			if (body.byteLength > MAX_BYTES) return reply({ error: "too large" }, 413);
			// The key comes from the bytes, so a caller cannot choose or overwrite another file's name.
			const hash = await sha256(body);
			if (hash !== name) return reply({ error: "hash does not match the file" }, 400);
			const key = `${hash}.${ext}`;
			if (!(await env.BUCKET.head(key))) {
				await env.BUCKET.put(key, body, { httpMetadata: { contentType: req.headers.get("content-type") } });
			}
			return reply({ key, url: `${env.PUBLIC_URL}/${key}` });
		}

		if (req.method === "DELETE") {
			if (!/^[0-9a-f]{64}\.[a-z]+$/.test(name)) return reply({ error: "bad key" }, 400);
			await env.BUCKET.delete(name);
			return reply({ deleted: name });
		}

		return reply({ error: "method not allowed" }, 405);
	},
};

