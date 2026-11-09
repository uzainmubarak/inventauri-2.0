import { describe, it, expect } from "vitest";
import { availabilityState, availabilityLabel } from "./index.js";

const dress = (over = {}) => ({ status: "active", made_to_order: true, ...over });

describe("availabilityState", () => {
	it("draft wins over stock", () => expect(availabilityState(dress({ status: "draft" }), 5)).toBe("draft"));
	it("archived wins over stock", () =>
		expect(availabilityState(dress({ status: "archived" }), 5)).toBe("archived"));
	it("in stock when quantity remains", () => expect(availabilityState(dress(), 2)).toBe("in_stock"));
	it("made to order at zero when remakeable", () =>
		expect(availabilityState(dress(), 0)).toBe("made_to_order"));
	it("sold out at zero when not remakeable", () =>
		expect(availabilityState(dress({ made_to_order: false }), 0)).toBe("sold_out"));
});

describe("availabilityLabel", () => {
	it("labels made_to_order for humans", () =>
		expect(availabilityLabel("made_to_order")).toBe("Made to order"));
	it("labels sold_out", () => expect(availabilityLabel("sold_out")).toBe("Sold out"));
});
