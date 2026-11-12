/**
 * Turn axis definitions into the variant combinations they imply.
 *
 * Variants are countable, SKU'd things. Four axes with five values each is
 * 625 rows, which would hang the browser and is never what anyone meant — so
 * generation is capped and the caller is told how many were skipped rather
 * than silently handed a short list. See docs/stock-module-schema.md.
 *
 * @typedef {{ axis: string, value: string }} AxisValue
 * @typedef {{ axis: string, values: string[] }} AxisDefinition
 */

const DEFAULT_MAX = 100;

/**
 * @param {AxisDefinition[]} axes
 * @param {{ max?: number }} [options]
 * @returns {{ variants: AxisValue[][], truncated: boolean, total: number }}
 */
export function generateVariantMatrix(axes, options = {}) {
	const max = options.max ?? DEFAULT_MAX;

	// An axis with no values contributes nothing — dropping it is what the
	// user means while they are still typing the first value.
	const usable = (axes ?? []).filter((a) => a.values?.length > 0);

	// Counted up front, so truncation is reported against the real total
	// rather than against however much we chose to build.
	const total = usable.reduce((product, a) => product * a.values.length, 1);

	/** @type {AxisValue[][]} */
	let variants = [[]];
	for (const { axis, values } of usable) {
		const next = [];
		for (const combination of variants) {
			for (const value of values) {
				if (next.length >= max) break;
				next.push([...combination, { axis, value }]);
			}
		}
		variants = next;
	}

	return { variants, truncated: total > max, total };
}

/** The order axes are listed in. */
const AXIS_ORDER = ["size", "color", "fabric", "other"];

/**
 * A variant's identity: its axis values, ignoring order and case. Two variants
 * with the same signature are the same thing.
 * @param {AxisValue[]} axisValues
 */
export function variantSignature(axisValues) {
	return [...axisValues]
		.filter((v) => v.value.trim())
		.sort((a, b) => a.axis.localeCompare(b.axis))
		.map((v) => `${v.axis}=${v.value.trim().toLowerCase()}`)
		.join("|");
}

/**
 * The axes and values that existing variants use, so a saved dress opens with
 * its axes filled in.
 * @param {{ axisValues?: AxisValue[] }[]} variants
 * @returns {AxisDefinition[]}
 */
export function axesOfVariants(variants) {
	/** @type {Map<string, string[]>} */
	const byAxis = new Map();
	for (const variant of variants) {
		for (const { axis, value } of variant.axisValues ?? []) {
			const text = value.trim();
			if (!text) continue;
			const values = byAxis.get(axis) ?? [];
			if (!values.some((v) => v.toLowerCase() === text.toLowerCase())) values.push(text);
			byAxis.set(axis, values);
		}
	}
	return [...byAxis]
		.sort(([a], [b]) => AXIS_ORDER.indexOf(a) - AXIS_ORDER.indexOf(b))
		.map(([axis, values]) => ({ axis, values }));
}

/**
 * The names of variants that appear more than once among the live ones.
 * Two variants with the same values would get the same SKU.
 * @param {{ axisValues?: AxisValue[], status?: string, deleted?: boolean }[]} variants
 * @returns {string[]}
 */
export function findDuplicateVariants(variants) {
	/** @type {Map<string, string>} */
	const firstLabel = new Map();
	/** @type {string[]} */
	const duplicates = [];
	for (const variant of variants) {
		if (variant.status === "archived" || variant.deleted) continue;
		const values = (variant.axisValues ?? []).filter((v) => v.value.trim());
		const signature = variantSignature(values);
		if (!signature) continue;
		const label = values.map((v) => v.value.trim()).join(" · ");
		if (!firstLabel.has(signature)) firstLabel.set(signature, label);
		else if (!duplicates.includes(signature)) duplicates.push(signature);
	}
	return duplicates.map((signature) => /** @type {string} */ (firstLabel.get(signature)));
}

/**
 * Variants as the services take them. Archived rows and rows marked `deleted` are
 * left out: on an edit, leaving a saved variant out is what archives it. Blank values are dropped,
 * and a new row with no values at all carries nothing, so it is left out too.
 * @param {{ id?: string, sku?: string | null, status?: string, deleted?: boolean, quantity?: number | null, price_override?: number | null, image_url?: string | null, axisValues?: AxisValue[] }[]} variants
 */
export function variantsForSave(variants) {
	return variants
		.filter((v) => v.status !== "archived" && !v.deleted)
		.map((v) => ({
			...(v.id ? { id: v.id } : {}),
			sku: v.sku ?? null,
			price_override: v.price_override ?? null,
			quantity: v.quantity ?? null,
			image_url: v.image_url ?? null,
			axisValues: (v.axisValues ?? [])
				.filter((av) => av.value.trim())
				.map((av) => ({ axis: av.axis, value: av.value.trim() })),
		}))
		.filter((v) => v.id || v.axisValues.length > 0);
}
