import { describe, it, expect } from "vitest";
import { numOrNull } from "./index.js";

describe("numOrNull", () => {
	it("keeps empty empty", () => {
		expect(numOrNull("")).toBe(null);
		expect(numOrNull(null)).toBe(null);
		expect(numOrNull(undefined)).toBe(null);
	});
	it("keeps a typed 0 as 0", () => {
		expect(numOrNull(0)).toBe(0);
		expect(numOrNull("0")).toBe(0);
	});
	it("reads numbers and numeric strings", () => {
		expect(numOrNull("185000")).toBe(185000);
		expect(numOrNull(12.5)).toBe(12.5);
	});
	it("treats text that is not a number as empty", () => expect(numOrNull("abc")).toBe(null));
});
