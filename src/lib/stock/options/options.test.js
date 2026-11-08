import { describe, it, expect } from "vitest";
import { optionIssues, optionsForSave, optionsFromDress } from "./index.js";

/** @param {string} uid @param {string} value @param {Record<string, any>} [over] */
const val = (uid, value, over = {}) => ({ uid, value, price_adjustment: 0, ...over });
/** @param {string} name @param {any[]} values @param {Record<string, any>} [over] */
const opt = (name, values, over = {}) => ({ uid: `o-${name}`, name, values, ...over });

describe("optionIssues", () => {
	it("is clean for a named option", () => expect(optionIssues([opt("Dupatta", [val("a", "Plain")])])).toEqual([null]));
	it("asks for a name when there are values", () =>
		expect(optionIssues([opt("  ", [val("a", "Plain")])])).toEqual(["Give this option a name."]));
	it("ignores a blank option with nothing in it", () => expect(optionIssues([opt("", [val("a", " ")])])).toEqual([null]));
});

describe("optionsForSave", () => {
	it("keeps ids, trims, drops blank and repeated values, and numbers the price", () => {
		const out = optionsForSave([
			opt("Dupatta style", [
				{ ...val("a", " Plain "), id: "ov1" },
				val("b", ""),
				val("c", "plain"),
				val("d", "Hand-painted", { price_adjustment: "40000", image_url: "https://x/y.jpg" }),
			], { id: "o1" }),
		]);
		expect(out).toEqual([
			{
				id: "o1",
				name: "Dupatta style",
				values: [
					{ id: "ov1", value: "Plain", price_adjustment: 0, image_url: null },
					{ value: "Hand-painted", price_adjustment: 40000, image_url: "https://x/y.jpg" },
				],
			},
		]);
	});

	it("leaves out an unnamed option and one with no values", () =>
		expect(optionsForSave([opt("", [val("a", "x")]), opt("Sleeves", [])])).toEqual([]));
});

describe("optionsFromDress", () => {
	const dress = {
		stock_dress_options: [
			{ id: "o2", name: "Sleeves", position: 1, stock_dress_option_values: [] },
			{ id: "o1", name: "Dupatta style", position: 0, stock_dress_option_values: [
				{ id: "v2", value: "Hand-painted", price_adjustment: "40000.00", position: 1, image_url: "https://x/y.jpg" },
				{ id: "v1", value: "Plain", price_adjustment: 0, position: 0 },
			] },
		],
	};

	it("orders options and values by position", () => {
		const options = optionsFromDress(dress);
		expect(options.map((o) => o.name)).toEqual(["Dupatta style", "Sleeves"]);
		expect(options[0].values.map((v) => v.value)).toEqual(["Plain", "Hand-painted"]);
	});

	it("turns prices into numbers and keeps the photo", () => {
		const [dupatta] = optionsFromDress(dress);
		expect(dupatta.values[1]).toMatchObject({ id: "v2", uid: "v2", price_adjustment: 40000, image_url: "https://x/y.jpg" });
		expect(dupatta.values[0].image_url).toBe(null);
	});

	it("handles a dress with no options", () => expect(optionsFromDress({})).toEqual([]));
});
