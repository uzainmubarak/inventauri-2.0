// Integration tests — these hit the LOCAL Supabase stack (see vitest.config.js,
// which loads .env.local). Requires `supabase start --exclude logflare,vector`.
// Run `supabase db reset` afterwards to clear the rows they create.
import { describe, it, expect, afterEach } from "vitest";
import {
	createStockDress,
	createStockDressWithDetails,
	getStockDressById,
	updateStockDressWithDetails,
	archiveStockDress,
	listStockDresses,
} from "./index.js";
import { listMovementsForVariant, listMovementsForDress } from "$lib/services/stockMovementsService";
import { updateStockSettings } from "$lib/services/stockSettingsService";
import { updateVariant } from "$lib/services/stockDressVariantsService";

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

	it("records dress-level opening stock when the dress has no variants", async () => {
		const { data } = await create({ opening_quantity: 4 });
		const { data: full } = await getStockDressById(data.dress.id);
		expect(full.quantity).toBe(4);

		const { data: movements } = await listMovementsForDress(data.dress.id);
		expect(movements).toHaveLength(1);
		expect(movements[0].variant_id).toBeNull();
		expect(movements[0].delta).toBe(4);
	});

	it("keeps the dress-level count apart from variant stock", async () => {
		const { data } = await create({
			variants: [{ price_override: null, quantity: 3, axisValues: [{ axis: "size", value: "M" }] }],
		});
		const { data: full } = await getStockDressById(data.dress.id);
		expect(full.quantity).toBe(0);
	});

	it("stores a dress-level movement even once the dress has variants, apart from variant stock", async () => {
		const { data } = await create({
			opening_quantity: 2,
			variants: [{ price_override: null, quantity: 1, axisValues: [{ axis: "size", value: "M" }] }],
		});
		const { data: full } = await getStockDressById(data.dress.id);
		expect(full.quantity).toBe(2);
		expect(full.stock_dress_variants[0].quantity).toBe(1);
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

	it("refuses an active dress priced at zero", async () => {
		const { error } = await createStockDressWithDetails({
			dress: { ...base, price: 0, compare_at_price: null },
			images: [],
			options: [],
			variants: [],
		});
		expect(error).toBeTruthy();
	});

	it("allows a draft priced at zero", async () => {
		const { error } = await createStockDressWithDetails({
			dress: { ...base, price: 0, compare_at_price: null, status: "draft" },
			images: [],
			options: [],
			variants: [],
		});
		expect(error).toBe(null);
	});

	it("records no opening stock when track_quantity is off", async () => {
		const { data } = await createStockDressWithDetails({
			dress: { ...base, track_quantity: false },
			images: [],
			options: [],
			variants: [{ price_override: null, quantity: 3, axisValues: [{ axis: "size", value: "M" }] }],
		});
		const { data: full } = await getStockDressById(data.dress.id);
		const variant = full.stock_dress_variants[0];
		expect(variant.quantity).toBe(0);
		const { data: movements } = await listMovementsForVariant(variant.id);
		expect(movements).toHaveLength(0);
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

	it("posts a changed variant quantity to the ledger and saves price, SKU and axis values", async () => {
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
			// The form says 99 and the ledger says 5: an adjustment of +94 is posted.
			variants: full.stock_dress_variants.map((v) => ({
				id: v.id,
				sku: "MY-SKU",
				price_override: 80000,
				quantity: 99,
				axisValues: [{ axis: "size", value: "L" }, { axis: "color", value: "Red" }],
			})),
		});
		const { data: after } = await getStockDressById(data.dress.id);
		expect(after.stock_dress_variants[0].quantity).toBe(99);
		expect(after.stock_dress_variants[0].sku).toBe("MY-SKU");
		expect(after.stock_dress_variants[0].stock_dress_variant_values).toHaveLength(2);
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

// SKUs are an input. The frontend generates them from stock_settings (or the
// user types them); the database never does.
describe("sku generation", () => {
	const defaults = /** @type {const} */ ({ sku_autogenerate: true, sku_prefix: "GSP", sku_separator: "-", sku_digits: 5 });
	const unique = () => crypto.randomUUID().slice(0, 8).toUpperCase();
	const sizeM = { price_override: null, quantity: 0, axisValues: [{ axis: "size", value: "M" }] };

	afterEach(() => updateStockSettings(defaults));

	it("builds the dress and variant sku from the saved format", async () => {
		await updateStockSettings({ sku_prefix: "TST", sku_separator: "_", sku_digits: 4 });
		const { data } = await create({ variants: [sizeM] });
		expect(data.dress.sku).toMatch(/^TST_\d{4,}$/);
		const { data: full } = await getStockDressById(data.dress.id);
		expect(full.stock_dress_variants[0].sku).toBe(`${data.dress.sku}_M`);
	});

	it("keeps a hand-typed dress sku and derives the variants from it", async () => {
		const sku = `HAND-${unique()}`;
		const { data } = await create({ dress: { ...base, sku }, variants: [sizeM] });
		expect(data.dress.sku).toBe(sku);
		const { data: full } = await getStockDressById(data.dress.id);
		expect(full.stock_dress_variants[0].sku).toBe(`${sku}-M`);
	});

	it("generates nothing when autogenerate is off", async () => {
		await updateStockSettings({ sku_autogenerate: false });
		const { data } = await create({ variants: [sizeM] });
		expect(data.dress.sku).toBeNull();
		const { data: full } = await getStockDressById(data.dress.id);
		expect(full.stock_dress_variants[0].sku).toBeNull();
		expect(full.stock_dress_variants[0].barcode).toBeNull();
	});

	it("keeps hand-typed skus when autogenerate is off", async () => {
		await updateStockSettings({ sku_autogenerate: false });
		const sku = `HAND-${unique()}`;
		const { data } = await create({
			dress: { ...base, sku },
			variants: [{ ...sizeM, sku: `${sku}-MED` }],
		});
		expect(data.dress.sku).toBe(sku);
		const { data: full } = await getStockDressById(data.dress.id);
		expect(full.stock_dress_variants[0].sku).toBe(`${sku}-MED`);
	});

	it("defaults the barcode to the sku and does not follow a later sku edit", async () => {
		const { data } = await create({ variants: [sizeM] });
		const { data: full } = await getStockDressById(data.dress.id);
		const variant = full.stock_dress_variants[0];
		expect(variant.barcode).toBe(variant.sku);

		await updateVariant(variant.id, { sku: `RENAMED-${unique()}` });
		const { data: after } = await getStockDressById(data.dress.id);
		expect(after.stock_dress_variants[0].barcode).toBe(variant.sku);
	});

	it("rejects a blank sku at the database", async () => {
		const { error } = await createStockDress({ ...base, sku: "   " });
		expect(error).toBeTruthy();
	});
});
