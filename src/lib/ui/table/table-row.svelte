<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLTableRowElement>> = $props();
</script>

<tr
	bind:this={ref}
	data-slot="table-row"
	class={cn("group/row h-14 border-b border-border-light transition-colors hover:bg-background data-[state=selected]:bg-accent data-[state=selected]:[&>td:first-child]:shadow-[inset_2px_0_0_var(--gold)]", className)}
	{...restProps}
>
	{@render children?.()}
</tr>
