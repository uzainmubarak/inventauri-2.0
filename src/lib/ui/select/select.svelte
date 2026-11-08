<script lang="ts">
	import type { HTMLSelectAttributes } from "svelte/elements";
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import { cn, type WithElementRef } from "$lib/utils.js";

	/**
	 * Native <select> dressed like Input. Pass <option>s as children and bind:value.
	 * Native on purpose: free keyboard, screen-reader and mobile-picker behaviour.
	 */
	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLSelectAttributes, HTMLSelectElement> = $props();
</script>

<div class="relative w-full" data-slot="select-wrapper">
	<select
		bind:this={ref}
		bind:value
		data-slot="select"
		class={cn(
			"border-input focus-visible:border-ring focus-visible:ring-ring aria-invalid:ring-destructive aria-invalid:border-destructive aria-invalid:bg-destructive/10 disabled:bg-input/50 h-9 w-full min-w-0 appearance-none rounded-lg border bg-transparent pr-9 pl-2.5 text-sm text-foreground transition-colors outline-none focus-visible:ring-1 aria-invalid:ring-1 disabled:cursor-not-allowed disabled:opacity-50",
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</select>
	<ChevronDownIcon
		class="text-text-muted pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2"
	/>
</div>
