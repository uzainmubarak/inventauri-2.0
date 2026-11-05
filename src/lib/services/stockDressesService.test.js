// Integration tests — these hit the LOCAL Supabase stack (see vitest.config.js,
// which loads .env.local). Requires `supabase start --exclude logflare,vector`.
// Run `supabase db reset` afterwards to clear the rows they create.
import { describe, it, expect } from "vitest";
import {
	createStockDressWithDetails,
	getStockDressById,
	updateStockDressWithDetails,
	archiveStockDress,
	listStockDresses,
} from "./stockDressesService.js";
import { listMovementsForVariant } from "./stockMovementsService.js";

const base = {
	name: "Test Farshi",
	garment_type: "Farshi Lehenga",
	category: "bridal",
	price: 70000,
	cost: 30000,
	compare_at_price: 95000,
	description: "d",
	notes: "n",
	tags: ["bridal", "zari"],
	made_to_order: true,
	track_quantity: true,
	status: "active",
};

const create = (over = {}) =>
	createStockDressWithDetails({ dress: base, images: [], options: [], variants: [], ...over });

describe("createStockDressWithDetails", () => {
	it("assigns a GSP sku", async () => {
		const { data } = await create();
		expect(data.dress.sku).toMatch(/^GSP-\d{5}$/);
	});

	it("persists v2 pricing and tags", async () => {
		const { data } = await create();
		const { data: full } = await getStockDressById(data.dress.id);
		expect(Number(full.price)).toBe(70000);
		expect(Number(full.compare_at_price)).toBe(95000);
		expect(full.tags).toEqual(["bridal", "zari"]);
	});

	it("records initial quantity as a received movement, not a direct write", async () => {
		const { data } = await create({
			variants: [{ price_override: null, quantity: 3, axisValues: [{ axis: "size", value: "M" }] }],
		});
		const { data: full } = await getStockDressById(data.dress.id);
		const variant = full.stock_dress_variants[0];
		expect(variant.quantity).toBe(3);
		expect(variant.sku).toBe(`${data.dress.sku}-M`);

		// The point of the ledger: quantity must come FROM a movement, not from
		// a direct write that happens to produce the same number.
		const { data: movements } = await listMovementsForVariant(variant.id);
		expect(movements).toHaveLength(1);
		expect(movements[0].reason).toBe("received");
		expect(movements[0].delta).toBe(3);
	});

	it("creates no movement when quantity is zero", async () => {
		const { data } = await create({
			variants: [{ price_override: null, quantity: 0, axisValues: [{ axis: "size", value: "S" }] }],
		});
		const { data: full } = await getStockDressById(data.dress.id);
		const variant = full.stock_dress_variants[0];
		expect(variant.quantity).toBe(0);
		const { data: movements } = await listMovementsForVariant(variant.id);
		expect(movements).toHaveLength(0);
	});

	it("builds a multi-axis sku from axis values", async () => {
		const { data } = await create({
			variants: [
				{
					price_override: null,
					quantity: 0,
					axisValues: [
						{ axis: "size", value: "M" },
						{ axis: "color", value: "Red" },
					],
				},
			],
		});
		const { data: full } = await getStockDressById(data.dress.id);
		expect(full.stock_dress_variants[0].sku).toBe(`${data.dress.sku}-RED-M`);
	});

	it("surfaces the compare_at constraint as an error, not a throw", async () => {
		const { error } = await createStockDressWithDetails({
			dress: { ...base, compare_at_price: 1000 },
			images: [],
			options: [],
			variants: [],
		});
		expect(error).toBeTruthy();
	});
});

describe("updateStockDressWithDetails", () => {
	it("archives a removed variant instead of deleting it", async () => {
		const { data } = await create({
			variants: [{ price_override: null, quantity: 1, axisValues: [{ axis: "size", value: "M" }] }],
		});
		const { data: full } = await getStockDressById(data.dress.id);
		await updateStockDressWithDetails(data.dress.id, {
			dress: base,
			currentImages: full.stock_dress_images,
			images: [],
			currentOptions: full.stock_dress_options,
			options: [],
			currentVariants: full.stock_dress_variants,
			variants: [],
		});
		const { data: after } = await getStockDressById(data.dress.id);
		expect(after.stock_dress_variants[0].status).toBe("archived");
	});

	it("ignores a quantity submitted on save — only the ledger moves it", async () => {
		const { data } = await create({
			variants: [{ price_override: null, quantity: 5, axisValues: [{ axis: "size", value: "L" }] }],
		});
		const { data: full } = await getStockDressById(data.dress.id);
		await updateStockDressWithDetails(data.dress.id, {
			dress: { ...base, name: "Renamed" },
			currentImages: [],
			images: [],
			currentOptions: [],
			options: [],
			currentVariants: full.stock_dress_variants,
			// Deliberately conflicting: the form says 99, the ledger says 5.
			variants: full.stock_dress_variants.map((v) => ({
				id: v.id,
				price_override: 80000,
				quantity: 99,
				axisValues: [{ axis: "size", value: "L" }],
			})),
		});
		const { data: after } = await getStockDressById(data.dress.id);
		expect(after.stock_dress_variants[0].quantity).toBe(5);
		expect(Number(after.stock_dress_variants[0].price_override)).toBe(80000);
	});
});

describe("listStockDresses", () => {
	it("returns rows with the fields the catalog renders", async () => {
		await create();
		const { data } = await listStockDresses();
		expect(data[0]).toHaveProperty("price");
		expect(data[0]).toHaveProperty("tags");
		expect(data[0]).toHaveProperty("made_to_order");
	});
});

describe("archiveStockDress", () => {
	it("sets status to archived", async () => {
		const { data } = await create();
		await archiveStockDress(data.dress.id);
		const { data: after } = await getStockDressById(data.dress.id);
		expect(after.status).toBe("archived");
	});
});
