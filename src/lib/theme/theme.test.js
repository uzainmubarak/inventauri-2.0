import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTheme, isDark } from "./index.js";

describe("theme", () => {
	beforeEach(() => {
		/** @type {Map<string, string>} */
		const store = new Map();
		vi.stubGlobal("localStorage", {
			getItem: (/** @type {string} */ k) => store.get(k) ?? null,
			setItem: (/** @type {string} */ k, /** @type {string} */ v) => store.set(k, v),
			removeItem: (/** @type {string} */ k) => store.delete(k),
		});
		vi.stubGlobal("matchMedia", () => ({ matches: true }));
	});

	it("defaults to system", () => expect(getTheme()).toBe("system"));
	it("reads a saved choice", () => {
		localStorage.setItem("theme", "dark");
		expect(getTheme()).toBe("dark");
	});
	it("ignores junk", () => {
		localStorage.setItem("theme", "purple");
		expect(getTheme()).toBe("system");
	});
	it("system follows the OS, light and dark do not", () => {
		expect(isDark("system")).toBe(true);
		expect(isDark("light")).toBe(false);
		expect(isDark("dark")).toBe(true);
	});
});
