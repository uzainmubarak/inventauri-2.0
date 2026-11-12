/**
 * A number field's value as it is saved: empty is null, anything else is a number.
 * A typed 0 is a real 0 and stays 0, so never test the value for truthiness.
 * @param {number | string | null | undefined} value
 * @returns {number | null}
 */
export function numOrNull(value) {
	if (value === null || value === undefined || value === "") return null;
	const n = Number(value);
	return Number.isNaN(n) ? null : n;
}
