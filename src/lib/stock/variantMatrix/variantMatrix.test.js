import { describe, it, expect } from "vitest";
import { generateVariantMatrix, variantSignature, axesOfVariants, findDuplicateVariants, variantsForSave } from "./index.js";

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

describe("variantSignature", () => {
	it("ignores order, case and spacing", () =>
		expect(variantSignature([{ axis: "size", value: " M " }, { axis: "color", value: "Red" }])).toBe(
			variantSignature([{ axis: "color", value: "red" }, { axis: "size", value: "m" }]),
		));
	it("ignores an axis left blank", () =>
		expect(variantSignature([{ axis: "size", value: "M" }, { axis: "color", value: " " }])).toBe("size=m"));
});

describe("axesOfVariants", () => {
	it("lists each axis with the distinct values in use, in the usual axis order", () => {
		const axes = axesOfVariants([
			{ axisValues: [{ axis: "color", value: "Ivory" }, { axis: "size", value: "S" }] },
			{ axisValues: [{ axis: "color", value: "ivory" }, { axis: "size", value: "M" }] },
		]);
		expect(axes).toEqual([
			{ axis: "size", values: ["S", "M"] },
			{ axis: "color", values: ["Ivory"] },
		]);
	});
	it("is empty when no variant has values", () => expect(axesOfVariants([{ axisValues: [] }, {}])).toEqual([]));
});

describe("findDuplicateVariants", () => {
	const v = (/** @type {string} */ size, status = "active") => ({ status, axisValues: [{ axis: "size", value: size }] });
	it("names a variant that appears twice", () => expect(findDuplicateVariants([v("M"), v("m"), v("L")])).toEqual(["M"]));
	it("ignores archived variants", () => expect(findDuplicateVariants([v("M"), v("M", "archived")])).toEqual([]));
	it("ignores variants with no values", () => expect(findDuplicateVariants([{ axisValues: [] }, { axisValues: [] }])).toEqual([]));
});

describe("variantsForSave", () => {
	it("leaves archived rows out, which is what archives a saved variant", () =>
		expect(variantsForSave([{ id: "a", status: "archived" }, { id: "b", status: "active", axisValues: [] }]).map((v) => v.id)).toEqual(["b"]));

	it("trims values and drops blank ones", () =>
		expect(variantsForSave([{ axisValues: [{ axis: "size", value: " M " }, { axis: "color", value: " " }] }])[0].axisValues).toEqual([
			{ axis: "size", value: "M" },
		]));

	it("drops a new row with no values but keeps a saved one", () =>
		expect(variantsForSave([{ axisValues: [{ axis: "size", value: "" }] }, { id: "x", axisValues: [] }]).map((v) => v.id)).toEqual(["x"]));

	it("keeps the price override and quantity", () =>
		expect(variantsForSave([{ id: "x", price_override: 90, quantity: 3, axisValues: [] }])[0]).toMatchObject({ price_override: 90, quantity: 3 }));
});
