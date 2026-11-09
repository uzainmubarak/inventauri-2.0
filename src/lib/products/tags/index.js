/**
 * Tag normalisation.
 *
 * Tags are a TEXT[] column and the autocomplete list is built from
 * SELECT DISTINCT unnest(tags), so duplicates, stray whitespace and empty
 * strings would all show up as separate suggestions. Normalise on the way
 * in rather than papering over it on the way out.
 */

/**
 * Accepts an array of tags or a comma-separated string. Keeps the casing of
 * the first occurrence, since "Zari" and "zari" are the same tag and the
 * first one typed is the one the user meant.
 *
 * @param {string[] | string | null | undefined} input
 * @returns {string[]}
 */
export function normaliseTags(input) {
	if (input === null || input === undefined) return [];

	const raw = typeof input === "string" ? input.split(",") : input;

	const seen = new Set();
	const result = [];
	for (const entry of raw) {
		const tag = String(entry ?? "").trim();
		if (!tag) continue;
		const key = tag.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(tag);
	}
	return result;
}
