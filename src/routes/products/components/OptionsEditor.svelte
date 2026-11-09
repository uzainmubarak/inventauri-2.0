<script>
	import { Button } from "$lib/ui/button";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import { newUid, optionIssues } from "$lib/products/options";
	import OptionRow from "./OptionRow.svelte";

	/**
	 * The order-time options of a dress, each edited in place.
	 * Props: `options` (bindable).
	 * @type {{ options: import("$lib/products/options").Option[] }}
	 */
	let { options = $bindable() } = $props();

	const issues = $derived(optionIssues(options));

	function addOption() {
		options = [...options, { uid: newUid(), name: "", values: [], editing: true, fresh: true }];
	}

	/** @param {number} index */
	function removeOption(index) {
		options = options.filter((_, i) => i !== index);
	}
</script>

<div class="flex flex-col gap-3">
	{#each options as option, i (option.uid)}
		<OptionRow bind:option={options[i]} issue={issues[i]} onRemove={() => removeOption(i)} />
	{/each}
	{#if options.length === 0}
		<p class="text-muted-foreground text-sm">
			No options. Add one if customers choose between styles when they order.
		</p>
	{/if}
	<Button variant="outline" class="w-fit" onclick={addOption}>
		<PlusIcon />{options.length === 0 ? "Add option" : "Add another option"}
	</Button>
</div>
