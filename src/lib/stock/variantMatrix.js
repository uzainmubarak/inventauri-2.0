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
