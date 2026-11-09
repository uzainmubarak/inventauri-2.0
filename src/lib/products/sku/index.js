// SKU strings are built here, in the frontend, from the format saved in
// stock_settings. The database never builds one. See docs/settings.md.

/** @typedef {{ sku_prefix: string, sku_separator: string, sku_digits: number }} SkuFormat */

/**
 * Dress SKU: prefix "GSP", separator "-", 5 digits, number 18 gives "GSP-00018".
 * A number longer than the digits is kept whole, never cut.
 * @param {SkuFormat} format
 * @param {number} number
 * @returns {string}
 */
export function formatDressSku(format, number) {
	const padded = String(number).padStart(format.sku_digits, "0");
	return [format.sku_prefix, padded].filter(Boolean).join(format.sku_separator);
}

/**
 * Variant SKU: the dress SKU plus the variant's option values, ordered by axis
 * (colour before size) and uppercased, e.g. "GSP-00018-RED-M". No values keeps
 * the bare dress SKU; no dress SKU means no variant SKU.
 * @param {SkuFormat} format
 * @param {string | null | undefined} dressSku
 * @param {{ axis: string, value: string }[]} axisValues
 * @returns {string | null}
 */
export function formatVariantSku(format, dressSku, axisValues) {
	if (!dressSku) return null;
	const values = [...axisValues]
		.sort((a, b) => a.axis.localeCompare(b.axis))
		.map((v) => v.value.trim().toUpperCase())
		.filter(Boolean);
	return [dressSku, ...values].join(format.sku_separator);
}

/**
 * What was typed in a SKU field: trimmed, blank becomes null.
 * @param {string | null | undefined} typed
 * @returns {string | null}
 */
export function cleanSku(typed) {
	return typed?.trim() || null;
}
