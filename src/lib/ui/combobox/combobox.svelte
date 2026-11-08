<script lang="ts">
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import { Input } from "$lib/ui/input";
	import { cn } from "$lib/utils.js";
	import type { HTMLInputAttributes } from "svelte/elements";

	/**
	 * Free-text input with a list of suggestions (native <datalist>).
	 * Props: `value` (bindable string), `options` (string[] suggestions).
	 * Anything typed is accepted, so a new value never needs an "add" step.
	 */
	let {
		value = $bindable(""),
		options = [],
		class: className,
		...restProps
	}: Omit<HTMLInputAttributes, "value" | "type" | "list" | "files"> & { value?: string; options?: string[] } =
		$props();

	const uid = $props.id();
	const listId = `combobox-${uid}`;
</script>

<div class="relative w-full" data-slot="combobox">
	<Input type="text" list={listId} bind:value class={cn("pr-9", className)} {...restProps} />
	<datalist id={listId}>
		{#each options as option (option)}
			<option value={option}></option>
		{/each}
	</datalist>
	<ChevronDownIcon
		class="text-text-muted pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2"
	/>
</div>
