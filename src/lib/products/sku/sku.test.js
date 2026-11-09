import { describe, it, expect } from "vitest";
import { formatDressSku, formatVariantSku, cleanSku } from "./index.js";

const format = { sku_prefix: "GSP", sku_separator: "-", sku_digits: 5 };

describe("formatDressSku", () => {
	it("pads the number to the chosen digits", () => {
		expect(formatDressSku(format, 18)).toBe("GSP-00018");
	});

	it("uses the chosen separator", () => {
		expect(formatDressSku({ ...format, sku_separator: "_" }, 18)).toBe("GSP_00018");
	});

	it("leaves out the separator when there is no prefix", () => {
		expect(formatDressSku({ ...format, sku_prefix: "" }, 18)).toBe("00018");
	});

	it("never cuts a number that outgrows the digits", () => {
		expect(formatDressSku({ ...format, sku_digits: 2 }, 12345)).toBe("GSP-12345");
	});
});

describe("formatVariantSku", () => {
	it("adds the option values to the dress sku", () => {
		expect(formatVariantSku(format, "GSP-00018", [{ axis: "size", value: "M" }])).toBe("GSP-00018-M");
	});

	it("orders values by axis and uppercases them", () => {
		const values = [
			{ axis: "size", value: "M" },
			{ axis: "color", value: " Red " },
		];
		expect(formatVariantSku(format, "GSP-00018", values)).toBe("GSP-00018-RED-M");
	});

	it("keeps the bare dress sku when there are no values", () => {
		expect(formatVariantSku(format, "GSP-00018", [])).toBe("GSP-00018");
	});

	it("is null when the dress has no sku", () => {
		expect(formatVariantSku(format, null, [{ axis: "size", value: "M" }])).toBeNull();
	});

	it("joins with the chosen separator", () => {
		expect(formatVariantSku({ ...format, sku_separator: "." }, "GSP.00018", [{ axis: "size", value: "M" }])).toBe(
			"GSP.00018.M",
		);
	});
});

describe("cleanSku", () => {
	it("trims what was typed", () => {
		expect(cleanSku("  AB-1 ")).toBe("AB-1");
	});

	it("turns blank input into null", () => {
		expect(cleanSku("   ")).toBeNull();
		expect(cleanSku(undefined)).toBeNull();
	});
});
