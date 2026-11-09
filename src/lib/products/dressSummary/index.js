/**
 * What a stock list row needs to know about a dress, worked out once.
 *
 * Quantity follows the inventory rule: with variants the dress total is the
 * sum of its non-archived variants, otherwise the dress holds its own count.
 * Photos that belong to a variant (variant_id set) never stand in for the
 * dress photo.
 */

import { effectivePrice } from "$lib/products/pricing";
import { availabilityState } from "$lib/products/availability";

/**
 * @param {any} dress - a stock_dresses row with its images and variants embedded
 */
export function summariseDress(dress) {
	/** @type {any[]} */
	const variants = (dress.stock_dress_variants ?? []).filter(
		/** @param {any} v */ (v) => v.status !== "archived",
	);

	const quantity =
		variants.length > 0
			? variants.reduce(/** @param {number} sum @param {any} v */ (sum, v) => sum + (v.quantity ?? 0), 0)
			: (dress.quantity ?? 0);

	const prices =
		variants.length > 0
			? variants.map(/** @param {any} v */ (v) => effectivePrice(dress, v))
			: [Number(dress.price)];
	const price = Math.min(...prices);

	/** @type {any[]} */
	const photos = (dress.stock_dress_images ?? []).filter(/** @param {any} i */ (i) => !i.variant_id);

	return {
		variantCount: variants.length,
		quantity,
		state: availabilityState(dress, quantity),
		price,
		priceVaries: price !== Math.max(...prices),
		image: photos.find(/** @param {any} i */ (i) => i.is_primary) ?? photos[0] ?? null,
	};
}
