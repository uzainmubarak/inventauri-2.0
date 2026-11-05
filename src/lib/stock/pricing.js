/**
 * Pricing arithmetic for the Stock module.
 *
 * profit and margin are deliberately NOT database columns — they are derived
 * from price and cost, and a stored copy would go stale the moment either
 * changes. See docs/stock-module-schema.md.
 *
 * `null` means "not computable" and is distinct from 0: a dress with no cost
 * recorded has an unknown profit, not a profit of zero.
 */

/**
 * @param {number | string | null | undefined} price
 * @param {number | string | null | undefined} cost
 * @returns {number | null}
 */
export function computeProfit(price, cost) {
	if (price === null || price === undefined || price === "") return null;
	if (cost === null || cost === undefined || cost === "") return null;
	return Number(price) - Number(cost);
}

/**
 * Profit as a fraction of price, e.g. 0.5714 for a 57.14% margin.
 *
 * @param {number | string | null | undefined} price
 * @param {number | string | null | undefined} cost
 * @returns {number | null}
 */
export function computeMargin(price, cost) {
	const profit = computeProfit(price, cost);
	if (profit === null) return null;
	const numericPrice = Number(price);
	if (numericPrice === 0) return null;
	return profit / numericPrice;
}

/**
 * What this variant actually sells for. A variant's price_override replaces
 * the parent dress price when set — including when it is 0, which is a real
 * price, not an absent one.
 *
 * @param {{ price: number | string }} dress
 * @param {{ price_override: number | string | null } | null | undefined} variant
 * @returns {number}
 */
export function effectivePrice(dress, variant) {
	const override = variant?.price_override;
	if (override !== null && override !== undefined && override !== "") {
		return Number(override);
	}
	return Number(dress.price);
}
