<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { HTMLInputAttributes } from "svelte/elements";

	/**
	 * Numeric input with a fixed unit on one side, e.g. prefix "Rs" for money or
	 * suffix "cm" for a length. Props: `value` (bindable), `prefix`, `suffix`.
	 * The border and focus ring sit on the wrapper so the unit stays inside them.
	 * Empty stays empty (`value` is null, never 0), and focusing selects the whole
	 * value so typing replaces it. The grey hint is the `placeholder`.
	 */
	let {
		value = $bindable(),
		prefix,
		suffix,
		class: className,
		...restProps
	}: Omit<HTMLInputAttributes, "value" | "prefix"> & {
		value?: number | string | null;
		prefix?: string;
		suffix?: string;
	} = $props();

	// A click would drop the selection again on mouseup, so that one mouseup is skipped.
	let justFocused = false;
</script>

<div
	data-slot="number-field"
	class={cn(
		"border-input focus-within:border-ring focus-within:ring-ring has-[input[aria-invalid=true]]:border-destructive has-[input[aria-invalid=true]]:bg-destructive/10 has-[input[aria-invalid=true]]:ring-destructive flex h-9 w-full overflow-hidden rounded-lg border transition-colors focus-within:ring-1 has-[input:disabled]:opacity-50 has-[input[aria-invalid=true]]:ring-1",
		className
	)}
>
	{#if prefix}
		<span
			class="bg-secondary text-muted-foreground border-border flex items-center border-r px-3 font-mono text-[13px]"
			>{prefix}</span
		>
	{/if}
	<input
		type="number"
		bind:value
		onfocus={(e) => {
			e.currentTarget.select();
			justFocused = true;
		}}
		onmouseup={(e) => {
			if (justFocused) e.preventDefault();
			justFocused = false;
		}}
		class="placeholder:text-muted-foreground/85 min-w-0 flex-1 bg-transparent px-2.5 text-right font-mono text-[13px] outline-none disabled:cursor-not-allowed"
		{...restProps}
	/>
	{#if suffix}
		<span
			class="bg-secondary text-muted-foreground border-border flex items-center border-l px-3 text-[13px]"
			>{suffix}</span
		>
	{/if}
</div>
