import { describe, it, expect } from "vitest";
import { generateVariantMatrix } from "./index.js";

const size = { axis: "size", values: ["S", "M"] };
const color = { axis: "color", values: ["Red", "Blue"] };

describe("generateVariantMatrix", () => {
	it("returns one empty variant for no axes — the custom/make-to-order case", () => {
		expect(generateVariantMatrix([])).toEqual({ variants: [[]], truncated: false, total: 1 });
	});

	it("returns one variant per value for a single axis", () => {
		const { variants } = generateVariantMatrix([size]);
		expect(variants).toEqual([
			[{ axis: "size", value: "S" }],
			[{ axis: "size", value: "M" }],
		]);
	});

	it("returns the cartesian product across axes", () => {
		const { variants, total } = generateVariantMatrix([size, color]);
		expect(total).toBe(4);
		expect(variants[0]).toEqual([
			{ axis: "size", value: "S" },
			{ axis: "color", value: "Red" },
		]);
	});

	it("skips axes with no values", () => {
		const { variants } = generateVariantMatrix([size, { axis: "fabric", values: [] }]);
		expect(variants).toHaveLength(2);
	});

	it("caps output and flags truncation", () => {
		const big = [
			{ axis: "size", values: ["A", "B", "C", "D", "E"] },
			{ axis: "color", values: ["A", "B", "C", "D", "E"] },
			{ axis: "fabric", values: ["A", "B", "C", "D", "E"] },
		];
		const { variants, truncated, total } = generateVariantMatrix(big, { max: 20 });
		expect(total).toBe(125);
		expect(variants).toHaveLength(20);
		expect(truncated).toBe(true);
	});

	it("reports total without truncating under the cap", () => {
		expect(generateVariantMatrix([size, color], { max: 100 }).truncated).toBe(false);
	});
});
