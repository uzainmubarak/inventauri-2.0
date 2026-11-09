import { describe, it, expect } from "vitest";
import { normaliseTags } from "./index.js";

describe("normaliseTags", () => {
	it("trims whitespace", () => expect(normaliseTags(["  zari "])).toEqual(["zari"]));
	it("drops empty and whitespace-only entries", () =>
		expect(normaliseTags(["", "   ", "zari"])).toEqual(["zari"]));
	it("removes duplicates case-insensitively", () =>
		expect(normaliseTags(["Zari", "zari"])).toEqual(["Zari"]));
	it("preserves order of first appearance", () =>
		expect(normaliseTags(["b", "a", "b"])).toEqual(["b", "a"]));
	it("splits a comma-separated string", () =>
		expect(normaliseTags("bridal, zari")).toEqual(["bridal", "zari"]));
	it("returns an empty array for null", () => expect(normaliseTags(null)).toEqual([]));
});
