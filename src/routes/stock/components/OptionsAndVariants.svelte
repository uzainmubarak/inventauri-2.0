<script>
	import { Button } from "$lib/ui/button";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import SlidersIcon from "@lucide/svelte/icons/sliders-horizontal";
	import { newUid, optionIssues, syncVariants } from "$lib/stock/optionVariants";
	import OptionRow from "./OptionRow.svelte";
	import VariantList from "./VariantList.svelte";

	/**
	 * The options of a dress and the variants they add up to, as one block.
	 * Options are edited in place; variants follow them and are never added by
	 * hand. A dress with no options holds its own count.
	 *
	 * Props: `options` and `variants` (bindable), `price` (the dress price),
	 * `trackQuantity`, `editing` (true on the edit page, where saved variants
	 * can be archived).
	 * @type {{
	 *   options: import("$lib/stock/optionVariants").Option[],
	 *   variants: import("$lib/stock/optionVariants").Variant[],
	 *   price: number | string,
	 *   trackQuantity: boolean,
	 *   editing?: boolean
	 * }}
	 */
	let { options = $bindable(), variants = $bindable(), price, trackQuantity, editing = false } = $props();

	let notice = $state("");

	const issues = $derived(optionIssues(options));
	const taken = $derived(options.map((o) => o.name.trim().toLowerCase()).filter(Boolean));
	const live = $derived(variants.filter((v) => v.status !== "archived"));
	const archivedCount = $derived(variants.filter((v) => v.id && v.status === "archived").length);
	const newCount = $derived(variants.filter((v) => !v.id).length);

	function resync() {
		const { variants: next, truncated, total } = syncVariants(options, variants);
		variants = next;
		notice = truncated ? `${total} combinations would be created; showing the first 100. Remove some values to see the rest.` : "";
	}

	/** @param {"structure" | "price"} kind */
	function changed(kind) {
		if (kind === "structure") resync();
	}

	/** @param {string} [name] */
	function addOption(name = "") {
		options = [...options, { uid: newUid(), name, values: [], editing: true, fresh: true }];
	}

	/** @param {number} index */
	function removeOption(index) {
		options = options.filter((_, i) => i !== index);
		resync();
	}
</script>

<div class="flex flex-col gap-3">
	{#if options.length === 0}
		<div class="border-text-muted flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-8 text-center">
			<div class="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-full">
				<SlidersIcon class="size-[18px]" />
			</div>
			<div class="text-sm font-semibold">No options yet</div>
			<p class="text-muted-foreground max-w-sm text-[13px] leading-relaxed">
				A dress with no options holds its own count. Add size, colour or fabric to count each
				combination on its own.
			</p>
			<div class="flex flex-wrap justify-center gap-2">
				{#each ["Size", "Colour", "Fabric"] as name (name)}
					<Button variant="outline" onclick={() => addOption(name)}><PlusIcon />{name}</Button>
				{/each}
				<Button variant="ghost" onclick={() => addOption()}>Other option</Button>
			</div>
		</div>
	{:else}
		{#each options as option, i (option.uid)}
			<OptionRow
				bind:option={options[i]}
				issue={issues[i]}
				{taken}
				onChange={changed}
				onRemove={() => removeOption(i)}
			/>
		{/each}
		<Button variant="outline" class="w-fit" onclick={() => addOption()}><PlusIcon />Add another option</Button>
	{/if}
</div>

{#if variants.length > 0}
	<div class="border-border-light flex flex-col gap-3 border-t pt-5">
		<div class="flex items-baseline justify-between">
			<h3 class="text-sm font-semibold">Variants</h3>
			<span class="text-muted-foreground text-[13px]">{live.length} {live.length === 1 ? "variant" : "variants"}</span>
		</div>
		<p class="text-muted-foreground text-[13px]">
			Variants update as you edit options. A price follows the dress price plus any option
			adjustment. Type a price to set one yourself.
		</p>

		{#if editing && (archivedCount > 0 || newCount > 0)}
			<div class="bg-accent border-gold-mid flex flex-col gap-1 rounded-lg border px-3.5 py-3">
				<span class="text-gold-text text-[13px] font-semibold">Variants will change when you save</span>
				<span class="text-[13px] leading-relaxed">
					{#if archivedCount > 0}{archivedCount} will be archived. Their stock history is kept.{/if}
					{#if newCount > 0}{newCount} new {newCount === 1 ? "variant starts" : "variants start"} at 0.{/if}
				</span>
			</div>
		{/if}
		{#if notice}
			<p class="bg-accent text-accent-foreground rounded-lg px-3 py-2 text-[13px]">{notice}</p>
		{/if}

		<VariantList {variants} {options} {price} {trackQuantity} onChange={(next) => (variants = next)} />
	</div>
{/if}
