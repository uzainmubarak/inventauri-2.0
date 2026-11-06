<script lang="ts">
	import type { HTMLThAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLThAttributes> = $props();
</script>

<th
	bind:this={ref}
	data-slot="table-head"
	class={cn("h-11 px-4 text-left align-middle text-xs font-medium whitespace-nowrap text-muted-foreground aria-[sort]:font-semibold aria-[sort]:text-foreground", className)}
	{...restProps}
>
	{@render children?.()}
</th>
