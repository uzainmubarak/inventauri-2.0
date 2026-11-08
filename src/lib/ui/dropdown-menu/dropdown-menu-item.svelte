<script lang="ts">
	import { DropdownMenu as MenuPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	/** One menu row. `variant="destructive"` tints it red for archive/delete. */
	let {
		ref = $bindable(null),
		class: className,
		variant = "default",
		...restProps
	}: MenuPrimitive.ItemProps & { variant?: "default" | "destructive" } = $props();
</script>

<MenuPrimitive.Item
	bind:ref
	data-slot="dropdown-menu-item"
	class={cn(
		"data-[highlighted]:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
		variant === "destructive" && "text-destructive data-[highlighted]:bg-destructive/10",
		className
	)}
	{...restProps}
/>
