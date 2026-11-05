/**
 * What a dress's availability reads as in the UI.
 *
 * Physical stock and design availability are independent at Golden Studio:
 * selling the only sample does not make the design unavailable, because a
 * new one can be made. That is why quantity alone cannot answer this and
 * made_to_order has to be consulted. See docs/stock-module-schema.md.
 */

/** @typedef {'draft'|'archived'|'in_stock'|'made_to_order'|'sold_out'} AvailabilityState */

/**
 * @param {{ status: string, made_to_order: boolean }} dress
 * @param {number} totalQuantity - summed across the dress's non-archived variants
 * @returns {AvailabilityState}
 */
export function availabilityState(dress, totalQuantity) {
	// Status is a decision about the design and outranks whatever is on the
	// rack: an archived design with stock left is still retired.
	if (dress.status === "draft") return "draft";
	if (dress.status === "archived") return "archived";

	if (totalQuantity > 0) return "in_stock";
	return dress.made_to_order ? "made_to_order" : "sold_out";
}

/** @type {Record<AvailabilityState, string>} */
const LABELS = {
	draft: "Draft",
	archived: "Archived",
	in_stock: "In stock",
	made_to_order: "Made to order",
	sold_out: "Sold out",
};

/**
 * @param {AvailabilityState} state
 * @returns {string}
 */
export function availabilityLabel(state) {
	return LABELS[state] ?? state;
}
