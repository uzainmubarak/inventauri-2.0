/**
 * Options are the choices a customer makes when ordering: dupatta style,
 * sleeve length. A value can add to the price and can have a photo. Options
 * are not counted and have no SKU; what hangs on the rack is a variant. See
 * docs/stock-module-schema.md ("Variant or option?").
 *
 * The form keeps a `uid` on every option and value so a row keeps its place
 * while its text is being edited.
 *
 * @typedef {{ uid: string, id?: string, value: string, price_adjustment: number | string | null, image_url?: string | null }} OptionValue
 * @typedef {{ uid: string, id?: string, name: string, values: OptionValue[], editing?: boolean, fresh?: boolean }} Option
 */

export const newUid = () =>
	globalThis.crypto?.randomUUID?.() ?? `u${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

/** @param {unknown} text */
const clean = (text) => String(text ?? "").trim();

/**
 * What is wrong with each option, or null. Same order as `options`. A blank
 * option with no values is fine: it is ignored until it is filled in.
 * @param {Option[]} options
 * @returns {(string | null)[]}
 */
export function optionIssues(options) {
	return options.map((option) =>
		!clean(option.name) && option.values.some((v) => clean(v.value)) ? "Give this option a name." : null,
	);
}

/**
 * Options as the services take them. An option with no name or no values
 * carries nothing and is left out; values are trimmed and repeated ones
 * (ignoring case) are dropped.
 * @param {Option[]} options
 */
export function optionsForSave(options) {
	return options.flatMap((option) => {
		const name = clean(option.name);
		if (!name) return [];
		const seen = new Set();
		const values = option.values.flatMap((v) => {
			const text = clean(v.value);
			if (!text || seen.has(text.toLowerCase())) return [];
			seen.add(text.toLowerCase());
			return [
				{
					...(v.id ? { id: v.id } : {}),
					value: text,
					price_adjustment: Number(v.price_adjustment) || 0,
					image_url: v.image_url || null,
				},
			];
		});
		return values.length ? [{ ...(option.id ? { id: option.id } : {}), name, values }] : [];
	});
}

/** @param {any} a @param {any} b */
const byPosition = (a, b) =>
	(a.position ?? 0) - (b.position ?? 0) || String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));

/**
 * A saved dress's options for the form.
 * @param {any} dress - a stock_dresses row with its options and their values embedded
 * @returns {Option[]}
 */
export function optionsFromDress(dress) {
	return [...(dress.stock_dress_options ?? [])].sort(byPosition).map(
		/** @param {any} o */ (o) => ({
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
					image_url: v.image_url ?? null,
				}),
			),
		}),
	);
}
