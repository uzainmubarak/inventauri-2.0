import { describe, it, expect } from "vitest";
import { summariseDress } from "./index.js";

/** @param {Record<string, any>} [over] */
const dress = (over = {}) => ({ price: 70000, status: "active", made_to_order: false, quantity: 0, ...over });
/** @param {number} quantity @param {Record<string, any>} [over] */
const variant = (quantity, over = {}) => ({ quantity, status: "active", price_override: null, ...over });

describe("summariseDress", () => {
	it("uses the dress's own count when there are no variants", () => {
		const s = summariseDress(dress({ quantity: 3 }));
		expect(s.quantity).toBe(3);
		expect(s.variantCount).toBe(0);
	});

	it("sums variants and ignores archived ones", () => {
		const s = summariseDress(
			dress({
				quantity: 9,
				stock_dress_variants: [variant(2), variant(3), variant(5, { status: "archived" })],
			}),
		);
		expect(s.quantity).toBe(5);
		expect(s.variantCount).toBe(2);
	});

	it("reads as sold out at zero without made to order", () =>
		expect(summariseDress(dress()).state).toBe("sold_out"));

	it("lets status outrank stock", () =>
		expect(summariseDress(dress({ status: "archived", quantity: 4 })).state).toBe("archived"));

	it("shows the cheapest price and flags when prices differ", () => {
		const s = summariseDress(
			dress({ stock_dress_variants: [variant(1), variant(1, { price_override: 80000 })] }),
		);
		expect(s.price).toBe(70000);
		expect(s.priceVaries).toBe(true);
	});

	it("does not flag a single shared price", () =>
		expect(summariseDress(dress({ stock_dress_variants: [variant(1), variant(1)] })).priceVaries).toBe(false));

	it("prefers the primary dress photo and skips variant photos", () => {
		const s = summariseDress(
			dress({
				stock_dress_images: [
					{ image_url: "variant", variant_id: "v1", is_primary: true },
					{ image_url: "plain" },
					{ image_url: "primary", is_primary: true },
				],
			}),
		);
		expect(s.image.image_url).toBe("primary");
	});

	it("has no image when only variants have photos", () =>
		expect(
			summariseDress(dress({ stock_dress_images: [{ image_url: "v", variant_id: "v1" }] })).image,
		).toBe(null));
});
