<script lang="ts">
	import { DropdownMenu as MenuPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 4,
		align = "end",
		...restProps
	}: MenuPrimitive.ContentProps = $props();
</script>

<MenuPrimitive.Portal>
	<MenuPrimitive.Content
		bind:ref
		{sideOffset}
		{align}
		data-slot="dropdown-menu-content"
		class={cn(
			"bg-popover text-popover-foreground ring-foreground/10 z-50 min-w-40 rounded-lg p-1 shadow-lg ring-1 outline-none",
			className
		)}
		{...restProps}
	/>
</MenuPrimitive.Portal>
