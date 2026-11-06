import { describe, it, expect } from "vitest";
import { computeProfit, computeMargin, effectivePrice } from "./index.js";

describe("computeProfit", () => {
	it("returns price minus cost", () => expect(computeProfit(70000, 30000)).toBe(40000));
	it("returns null when cost is missing", () => expect(computeProfit(70000, null)).toBe(null));
	it("returns null when price is missing", () => expect(computeProfit(null, 30000)).toBe(null));
	it("can be negative", () => expect(computeProfit(20000, 30000)).toBe(-10000));
});

describe("computeMargin", () => {
	it("returns a fraction of price", () => expect(computeMargin(70000, 30000)).toBeCloseTo(0.5714, 4));
	it("returns null when price is zero", () => expect(computeMargin(0, 30000)).toBe(null));
	it("returns null when cost is missing", () => expect(computeMargin(70000, null)).toBe(null));
});

describe("effectivePrice", () => {
	it("uses the variant override when set", () =>
		expect(effectivePrice({ price: 70000 }, { price_override: 85000 })).toBe(85000));
	it("falls back to the dress price", () =>
		expect(effectivePrice({ price: 70000 }, { price_override: null })).toBe(70000));
	it("falls back when there is no variant", () =>
		expect(effectivePrice({ price: 70000 }, null)).toBe(70000));
	it("treats an override of 0 as a real price", () =>
		expect(effectivePrice({ price: 70000 }, { price_override: 0 })).toBe(0));
});
