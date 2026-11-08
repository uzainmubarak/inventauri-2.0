// Integration tests — hit the LOCAL Supabase stack (see vitest.config.js).
import { describe, it, expect, afterEach } from "vitest";
import { getStockSettings, updateStockSettings, nextSkuNumber } from "./index.js";

const defaults = /** @type {const} */ ({ sku_autogenerate: true, sku_prefix: "GSP", sku_separator: "-", sku_digits: 5 });

afterEach(() => updateStockSettings(defaults));

describe("stock settings", () => {
	it("reads the single settings row", async () => {
		const { data, error } = await getStockSettings();
		expect(error).toBeNull();
		expect(data).toMatchObject(defaults);
	});

	it("saves a new sku format", async () => {
		const { data, error } = await updateStockSettings({ sku_prefix: "ABC", sku_digits: 3 });
		expect(error).toBeNull();
		expect(data).toMatchObject({ sku_prefix: "ABC", sku_digits: 3 });
	});

	it("rejects a lowercase prefix", async () => {
		const { error } = await updateStockSettings({ sku_prefix: "abc" });
		expect(error).toBeTruthy();
	});

	it("rejects zero digits", async () => {
		const { error } = await updateStockSettings({ sku_digits: 0 });
		expect(error).toBeTruthy();
	});
});

describe("nextSkuNumber", () => {
	it("hands out increasing numbers", async () => {
		const { data: first } = await nextSkuNumber();
		const { data: second } = await nextSkuNumber();
		expect(second).toBeGreaterThan(/** @type {number} */ (first));
	});
});
