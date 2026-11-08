/**
 * Options and variants as one thing: each option (Size, Colour, Fabric...) is
 * an axis, and a variant is one combination of option values.
 *
 * The form edits options. Everything about variants follows from them, so
 * this module turns the options into variants and back into what gets saved.
 * See docs/ui/inventory-components.md.
 *
 * A value is identified by its `uid`, not its text. That is what lets a value
 * be renamed without the variants built on it being thrown away, along with
 * the quantities typed into them.
 *
 * @typedef {{ uid: string, id?: string, value: string, price_adjustment: number | string | null }} OptionValue
 * @typedef {{ uid: string, id?: string, name: string, values: OptionValue[], editing?: boolean, fresh?: boolean }} Option
 * @typedef {{ axis: string, value: string }} AxisValue
 * @typedef {{
 *   id?: string, sku?: string | null, barcode?: string | null, status: string,
 *   quantity: number | string | null, price_override: number | string | null,
 *   manualPrice: boolean, axisValues: AxisValue[], valueUids: string[]
 * }} Variant
 */

import { generateVariantMatrix } from "$lib/stock/variantMatrix";

export const SUGGESTED_OPTIONS = ["Size", "Colour", "Fabric"];

/** The schema stores four axes. The studio spells "color" with a u. */
const AXIS_BY_NAME = /** @type {Record<string, string>} */ ({
	size: "size",
	colour: "color",
	color: "color",
	fabric: "fabric",
});
const AXIS_LABEL = /** @type {Record<string, string>} */ ({
	size: "Size",
	color: "Colour",
	fabric: "Fabric",
	other: "Other",
});

/** @param {unknown} text */
const clean = (text) => String(text ?? "").trim();

export const newUid = () =>
	globalThis.crypto?.randomUUID?.() ?? `u${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

/** @param {string} name */
export function axisFor(name) {
	return AXIS_BY_NAME[clean(name).toLowerCase()] ?? "other";
}

/** @param {string} axis */
export function axisLabel(axis) {
	return AXIS_LABEL[axis] ?? axis;
}

/**
 * What is wrong with each option, or null. Same order as `options`. A blank
 * option with no values is fine: it is ignored until it is filled in.
 * @param {Option[]} options
 * @returns {(string | null)[]}
 */
export function optionIssues(options) {
	const taken = new Set();
	return options.map((option) => {
		const name = clean(option.name);
		if (!name) return option.values.some((v) => clean(v.value)) ? "Give this option a name." : null;
		const axis = axisFor(name);
		if (taken.has(axis)) {
			return axis === "other"
				? "Only one custom option is supported for now. Rename it Size, Colour or Fabric, or remove one."
				: `There is already a ${axisLabel(axis)} option.`;
		}
		taken.add(axis);
		return null;
	});
}

/**
 * The options that make variants: named, without a problem, with at least one
 * value. Values are trimmed and de-duplicated ignoring case.
 * @param {Option[]} options
 */
export function optionAxes(options) {
	const issues = optionIssues(options);
	return options.flatMap((option, i) => {
		if (issues[i] || !clean(option.name)) return [];
		const seen = new Set();
		const values = option.values.flatMap((v) => {
			const text = clean(v.value);
			if (!text || seen.has(text.toLowerCase())) return [];
			seen.add(text.toLowerCase());
			return [{ uid: v.uid, text }];
		});
		return values.length ? [{ axis: axisFor(option.name), values }] : [];
	});
}

/** @param {string[]} valueUids */
const keyOf = (valueUids) => [...valueUids].sort().join("|");

/**
 * Variants for the current options, reusing the ones already there.
 *  - a variant whose values are all still present is kept, with its stock and
 *    price, even if a value was renamed
 *  - adding an option gives each existing variant the first value of it, and
 *    removing one keeps the first variant of each remaining combination
 *  - any other new combination starts at quantity 0
 *  - a saved variant that no longer fits stays in the list as archived, so
 *    saving archives it (its stock history must survive); an unsaved one goes
 *  - removing every option leaves no variants
 *
 * @param {Option[]} options
 * @param {Variant[]} current
 * @param {{ max?: number }} [limits]
 * @returns {{ variants: Variant[], truncated: boolean, total: number }}
 */
export function syncVariants(options, current, { max = 100 } = {}) {
	const axes = optionAxes(options);
	const { variants: combinations, truncated, total } = generateVariantMatrix(
		axes.map((a) => ({ axis: a.axis, values: a.values.map((v) => v.text) })),
		{ max },
	);

	const uidOf = new Map(axes.flatMap((a) => a.values.map((v) => [`${a.axis}|${v.text.toLowerCase()}`, v.uid])));
	const wanted = (axes.length ? combinations : []).map((axisValues) => ({
		axisValues,
		valueUids: axisValues.map((av) => /** @type {string} */ (uidOf.get(`${av.axis}|${av.value.toLowerCase()}`))),
	}));

	/** @param {Variant} variant @param {{ axisValues: AxisValue[], valueUids: string[] }} target */
	const adopt = (variant, target) => ({ ...variant, ...target, status: "active" });
	/** @param {string[]} small @param {string[]} big */
	const within = (small, big) => small.length > 0 && small.every((uid) => big.includes(uid));

	/** @type {(Variant | null)[]} */
	const placed = wanted.map(() => null);
	const taken = new Set();

	// 1. A variant whose values are all still there stays as it is, even if a
	//    value was renamed.
	const existing = new Map(current.filter((v) => v.valueUids?.length).map((v) => [keyOf(v.valueUids), v]));
	wanted.forEach((target, i) => {
		const match = existing.get(keyOf(target.valueUids));
		if (match && !taken.has(match)) {
			placed[i] = adopt(match, target);
			taken.add(match);
		}
	});

	// 2. Adding an option gives each existing variant the first value of it;
	//    removing one keeps the first variant of each remaining combination.
	for (const variant of current) {
		if (taken.has(variant) || !variant.valueUids?.length) continue;
		let i = wanted.findIndex((t, at) => !placed[at] && within(variant.valueUids, t.valueUids));
		if (i < 0) i = wanted.findIndex((t, at) => !placed[at] && within(t.valueUids, variant.valueUids));
		if (i >= 0) {
			placed[i] = adopt(variant, wanted[i]);
			taken.add(variant);
		}
	}

	const next = placed.map(
		(variant, i) =>
			variant ??
			/** @type {Variant} */ ({
				...wanted[i],
				quantity: 0,
				price_override: null,
				manualPrice: false,
				status: "active",
			}),
	);

	const archived = current.filter((v) => v.id && !taken.has(v)).map((v) => ({ ...v, status: "archived" }));

	return { variants: [...next, ...archived], truncated, total };
}

/**
 * What the chosen values add to the dress price.
 * @param {Option[]} options
 * @param {string[]} valueUids
 */
export function priceAdjustment(options, valueUids) {
	const byUid = new Map(options.flatMap((o) => o.values.map((v) => [v.uid, Number(v.price_adjustment) || 0])));
	return (valueUids ?? []).reduce((sum, uid) => sum + (byUid.get(uid) ?? 0), 0);
}

/**
 * The price a variant has unless someone types one: the dress price plus
 * the adjustments of its values.
 * @param {number | string} dressPrice
 * @param {Option[]} options
 * @param {Variant} variant
 */
export function autoPrice(dressPrice, options, variant) {
	return (Number(dressPrice) || 0) + priceAdjustment(options, variant.valueUids);
}

/**
 * Options as the services take them. Unnamed options, options with a problem
 * and options with no values carry nothing and are left out.
 * @param {Option[]} options
 */
export function optionsForSave(options) {
	const issues = optionIssues(options);
	return options.flatMap((option, i) => {
		const name = clean(option.name);
		if (!name || issues[i]) return [];
		const seen = new Set();
		const values = option.values.flatMap((v) => {
			const text = clean(v.value);
			if (!text || seen.has(text.toLowerCase())) return [];
			seen.add(text.toLowerCase());
			return [{ ...(v.id ? { id: v.id } : {}), value: text, price_adjustment: Number(v.price_adjustment) || 0 }];
		});
		return values.length ? [{ ...(option.id ? { id: option.id } : {}), name, values }] : [];
	});
}

/**
 * Variants as the services take them. Archived rows are left out: on an edit,
 * leaving a saved variant out is what archives it. A price the user typed is
 * kept; any other price follows the dress price and the option adjustments.
 * @param {number | string} dressPrice
 * @param {Option[]} options
 * @param {Variant[]} variants
 */
export function variantsForSave(dressPrice, options, variants) {
	return variants
		.filter((v) => v.status !== "archived")
		.map((v) => {
			const adjustment = priceAdjustment(options, v.valueUids);
			const typed = v.price_override === "" || v.price_override == null ? null : Number(v.price_override);
			return {
				...(v.id ? { id: v.id } : {}),
				price_override: v.manualPrice ? typed : adjustment === 0 ? null : (Number(dressPrice) || 0) + adjustment,
				quantity: v.quantity,
				axisValues: v.axisValues,
			};
		});
}

/** @param {any} a @param {any} b */
const byPosition = (a, b) =>
	(a.position ?? 0) - (b.position ?? 0) || String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));

/**
 * Options and variants for the form from a saved dress.
 *  - variants saved before options and axes were one thing show their axes as
 *    options, so nothing is lost the first time the options are edited
 *  - a saved variant price that differs from dress price + adjustments is one
 *    someone typed, so it is kept as typed
 * @param {any} dress - a stock_dresses row with its options and variants embedded
 * @returns {{ options: Option[], variants: Variant[] }}
 */
export function fromDress(dress) {
	/** @type {Option[]} */
	const options = [...(dress.stock_dress_options ?? [])].sort(byPosition).map((o) => ({
		uid: o.id,
		id: o.id,
		name: o.name,
		editing: false,
		values: [...(o.stock_dress_option_values ?? [])].sort(byPosition).map(
			/** @param {any} v */ (v) => ({
				uid: v.id,
				id: v.id,
				value: v.value,
				price_adjustment: Number(v.price_adjustment) || 0,
			}),
		),
	}));

	const rows = (dress.stock_dress_variants ?? []).filter(/** @param {any} v */ (v) => v.status !== "archived");

	/** @type {Map<string, string[]>} */
	const seenOnRows = new Map();
	for (const row of rows) {
		for (const av of row.stock_dress_variant_values ?? []) {
			const values = seenOnRows.get(av.axis) ?? [];
			if (!values.some((x) => x.toLowerCase() === av.value.toLowerCase())) values.push(av.value);
			seenOnRows.set(av.axis, values);
		}
	}
	for (const [axis, values] of seenOnRows) {
		if (options.some((o) => axisFor(o.name) === axis)) continue;
		options.push({
			uid: newUid(),
			name: axisLabel(axis),
			editing: false,
			values: values.map((value) => ({ uid: newUid(), value, price_adjustment: 0 })),
		});
	}

	const variants = rows.map(
		/** @param {any} row */ (row) => {
			/** @type {AxisValue[]} */
			const axisValues = (row.stock_dress_variant_values ?? []).map(
				/** @param {any} av */ (av) => ({ axis: av.axis, value: av.value }),
			);
			const valueUids = axisValues.map((av) => {
				const option = options.find((o) => axisFor(o.name) === av.axis);
				const match = option?.values.find((v) => clean(v.value).toLowerCase() === av.value.toLowerCase());
				return match?.uid ?? `unmatched:${av.axis}:${av.value.toLowerCase()}`;
			});
			const override = row.price_override;
			const hasOverride = override !== null && override !== undefined;
			const expected = (Number(dress.price) || 0) + priceAdjustment(options, valueUids);
			const manualPrice = hasOverride && Number(override) !== expected;
			return /** @type {Variant} */ ({
				id: row.id,
				sku: row.sku,
				barcode: row.barcode,
				status: row.status,
				quantity: row.quantity,
				price_override: manualPrice ? override : null,
				manualPrice,
				axisValues,
				valueUids,
			});
		},
	);

	return { options, variants };
}
