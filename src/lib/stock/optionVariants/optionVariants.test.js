import { describe, it, expect } from "vitest";
import {
	axisFor,
	optionIssues,
	optionAxes,
	syncVariants,
	priceAdjustment,
	autoPrice,
	optionsForSave,
	variantsForSave,
	fromDress,
} from "./index.js";

/** @param {string} uid @param {string} value @param {number} [adj] */
const val = (uid, value, adj = 0) => ({ uid, value, price_adjustment: adj });
/** @param {string} name @param {any[]} values @param {Record<string, any>} [over] */
const opt = (name, values, over = {}) => ({ uid: `o-${name}`, name, values, ...over });

const size = () => opt("Size", [val("s", "S"), val("m", "M")]);
const colour = () => opt("Colour", [val("iv", "Ivory"), val("ro", "Rose", 5000)]);

describe("axisFor", () => {
	it("maps the usual names to the schema's axes", () => {
		expect(axisFor("Size")).toBe("size");
		expect(axisFor(" colour ")).toBe("color");
		expect(axisFor("Color")).toBe("color");
		expect(axisFor("FABRIC")).toBe("fabric");
	});
	it("sends any other name to 'other'", () => expect(axisFor("Dupatta style")).toBe("other"));
});

describe("optionIssues", () => {
	it("is clean for sensible options", () => expect(optionIssues([size(), colour()])).toEqual([null, null]));
	it("asks for a name when values exist", () =>
		expect(optionIssues([opt("", [val("a", "S")])])).toEqual(["Give this option a name."]));
	it("ignores a blank option with nothing in it", () => expect(optionIssues([opt("", [])])).toEqual([null]));
	it("flags a repeated axis", () => {
		const issues = optionIssues([size(), opt("size", [val("x", "L")])]);
		expect(issues[0]).toBe(null);
		expect(issues[1]).toMatch(/already a Size/);
	});
	it("allows only one custom option", () => {
		const issues = optionIssues([opt("Dupatta", [val("a", "x")]), opt("Sleeves", [val("b", "y")])]);
		expect(issues[1]).toMatch(/one custom option/);
	});
});

describe("optionAxes", () => {
	it("drops blank and repeated values, ignoring case", () => {
		const axes = optionAxes([opt("Size", [val("a", "S"), val("b", " s "), val("c", ""), val("d", "M")])]);
		expect(axes).toEqual([{ axis: "size", values: [{ uid: "a", text: "S" }, { uid: "d", text: "M" }] }]);
	});
	it("skips an option that has a problem", () =>
		expect(optionAxes([size(), opt("Size", [val("z", "XL")])])).toHaveLength(1));
});

describe("syncVariants", () => {
	it("builds every combination, each starting at 0", () => {
		const { variants } = syncVariants([size(), colour()], []);
		expect(variants.map((v) => v.axisValues.map((a) => a.value).join("/"))).toEqual([
			"S/Ivory", "S/Rose", "M/Ivory", "M/Rose",
		]);
		expect(variants.every((v) => v.quantity === 0 && v.status === "active")).toBe(true);
	});

	it("builds nothing when there are no options", () =>
		expect(syncVariants([], []).variants).toEqual([]));

	it("keeps a variant, and what was typed into it, when a value is renamed", () => {
		const first = syncVariants([size()], []).variants;
		first[0].quantity = 4;
		const renamed = opt("Size", [val("s", "Small"), val("m", "M")]);
		const { variants } = syncVariants([renamed], first);
		expect(variants[0].axisValues[0].value).toBe("Small");
		expect(variants[0].quantity).toBe(4);
	});

	it("archives a saved variant that no longer fits, and drops an unsaved one", () => {
		const current = [
			{ id: "v-l", status: "active", quantity: 2, valueUids: ["l"], axisValues: [{ axis: "size", value: "L" }] },
			{ status: "active", quantity: 1, valueUids: ["xl"], axisValues: [{ axis: "size", value: "XL" }] },
		];
		const { variants } = syncVariants([size()], /** @type {any} */ (current));
		const left = variants.filter((v) => !["s", "m"].some((u) => v.valueUids.includes(u)));
		expect(left).toHaveLength(1);
		expect(left[0]).toMatchObject({ id: "v-l", status: "archived" });
	});

	it("restores an archived variant when its value comes back", () => {
		const current = [
			{ id: "v-s", status: "archived", quantity: 3, valueUids: ["s"], axisValues: [{ axis: "size", value: "S" }] },
		];
		const { variants } = syncVariants([size()], /** @type {any} */ (current));
		expect(variants.find((v) => v.id === "v-s")).toMatchObject({ status: "active", quantity: 3 });
	});

	it("archives every saved variant when all options go", () => {
		const current = [{ id: "v", status: "active", quantity: 1, valueUids: ["s"], axisValues: [] }];
		expect(syncVariants([], /** @type {any} */ (current)).variants).toEqual([
			expect.objectContaining({ id: "v", status: "archived" }),
		]);
	});

	it("gives existing variants the first value of a newly added option", () => {
		const sizeOnly = syncVariants([size()], []).variants.map((v, i) => ({ ...v, id: `v${i}`, quantity: i + 2 }));
		const { variants } = syncVariants([size(), colour()], sizeOnly);
		const byName = Object.fromEntries(variants.map((v) => [v.axisValues.map((a) => a.value).join("/"), v]));
		expect(byName["S/Ivory"]).toMatchObject({ id: "v0", quantity: 2 });
		expect(byName["M/Ivory"]).toMatchObject({ id: "v1", quantity: 3 });
		expect(byName["S/Rose"].id).toBeUndefined();
		expect(byName["S/Rose"].quantity).toBe(0);
		expect(variants.filter((v) => v.status === "archived")).toHaveLength(0);
	});

	it("keeps the first variant of each combination when an option is removed", () => {
		const both = syncVariants([size(), colour()], []).variants.map((v, i) => ({ ...v, id: `v${i}`, quantity: 1 }));
		const { variants } = syncVariants([size()], both);
		const live = variants.filter((v) => v.status === "active");
		expect(live.map((v) => v.id)).toEqual(["v0", "v2"]);
		expect(variants.filter((v) => v.status === "archived").map((v) => v.id).sort()).toEqual(["v1", "v3"]);
	});

	it("reports when the cap cut the list short", () => {
		const big = opt("Size", Array.from({ length: 12 }, (_, i) => val(`s${i}`, `S${i}`)));
		const other = opt("Fabric", Array.from({ length: 12 }, (_, i) => val(`f${i}`, `F${i}`)));
		const r = syncVariants([big, other], [], { max: 100 });
		expect(r.truncated).toBe(true);
		expect(r.total).toBe(144);
		expect(r.variants).toHaveLength(100);
	});
});

describe("prices", () => {
	it("adds the adjustments of the chosen values", () =>
		expect(priceAdjustment([size(), colour()], ["s", "ro"])).toBe(5000));
	it("is the dress price plus adjustments", () => {
		const [rose] = syncVariants([colour()], []).variants.slice(1);
		expect(autoPrice(185000, [colour()], rose)).toBe(190000);
	});
});

describe("optionsForSave", () => {
	it("keeps ids, trims, drops blanks and options with no values", () => {
		const out = optionsForSave([
			opt("Size", [{ ...val("a", " S "), id: "ov1" }, val("b", ""), val("c", "s")], { id: "o1" }),
			opt("", [val("x", "ignored")]),
			opt("Colour", []),
		]);
		expect(out).toEqual([{ id: "o1", name: "Size", values: [{ id: "ov1", value: "S", price_adjustment: 0 }] }]);
	});
});

describe("variantsForSave", () => {
	it("leaves archived rows out, which is what archives a saved variant", () => {
		const out = variantsForSave(100, [], /** @type {any} */ ([
			{ id: "a", status: "archived", valueUids: [], axisValues: [] },
			{ id: "b", status: "active", valueUids: [], axisValues: [], quantity: 2 },
		]));
		expect(out.map((v) => v.id)).toEqual(["b"]);
	});

	it("saves no override when nothing adjusts the price", () =>
		expect(variantsForSave(100, [size()], /** @type {any} */ ([{ status: "active", valueUids: ["s"], axisValues: [], quantity: 0 }]))[0].price_override).toBe(null));

	it("saves dress price plus adjustment", () =>
		expect(variantsForSave(185000, [colour()], /** @type {any} */ ([{ status: "active", valueUids: ["ro"], axisValues: [], quantity: 0 }]))[0].price_override).toBe(190000));

	it("keeps a price that was typed", () =>
		expect(variantsForSave(185000, [colour()], /** @type {any} */ ([{ status: "active", valueUids: ["ro"], axisValues: [], quantity: 0, manualPrice: true, price_override: "200000" }]))[0].price_override).toBe(200000));
});

describe("fromDress", () => {
	const dress = {
		price: 100,
		stock_dress_options: [
			{ id: "o1", name: "Size", position: 0, stock_dress_option_values: [
				{ id: "ov-s", value: "S", price_adjustment: 0, position: 0 },
				{ id: "ov-m", value: "M", price_adjustment: 0, position: 1 },
			] },
		],
		stock_dress_variants: [
			{ id: "v1", sku: "X-S", barcode: "X-S", status: "active", quantity: 2, price_override: null,
				stock_dress_variant_values: [{ axis: "size", value: "S" }] },
			{ id: "v2", sku: "X-M", barcode: "X-M", status: "active", quantity: 1, price_override: 130,
				stock_dress_variant_values: [{ axis: "size", value: "M" }] },
			{ id: "v3", status: "archived", quantity: 0, price_override: null, stock_dress_variant_values: [] },
		],
	};

	it("ties each variant to the option values it is built from", () => {
		const { options, variants } = fromDress(dress);
		expect(options[0].values.map((v) => v.uid)).toEqual(["ov-s", "ov-m"]);
		expect(variants.map((v) => v.valueUids)).toEqual([["ov-s"], ["ov-m"]]);
	});

	it("treats a price that differs from the expected one as typed", () => {
		const { variants } = fromDress(dress);
		expect(variants[0]).toMatchObject({ manualPrice: false, price_override: null });
		expect(variants[1]).toMatchObject({ manualPrice: true, price_override: 130 });
	});

	it("shows axes of older variants as options so editing does not archive them", () => {
		const legacy = { ...dress, stock_dress_options: [] };
		const { options, variants } = fromDress(legacy);
		expect(options).toHaveLength(1);
		expect(options[0].name).toBe("Size");
		expect(options[0].values.map((v) => v.value)).toEqual(["S", "M"]);
		const synced = syncVariants(options, variants).variants;
		expect(synced.map((v) => v.id)).toEqual(["v1", "v2"]);
		expect(synced.every((v) => v.status === "active")).toBe(true);
	});
});
