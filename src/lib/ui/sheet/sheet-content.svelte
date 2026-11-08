<script lang="ts">
	import { Dialog as SheetPrimitive } from "bits-ui";
	import XIcon from "@lucide/svelte/icons/x";
	import { cn } from "$lib/utils.js";

	/**
	 * Right-hand drawer for read-only detail. Built on a dialog, so focus is
	 * trapped, Escape closes it and the page behind is inert while it is open.
	 */
	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: SheetPrimitive.ContentProps = $props();
</script>

<SheetPrimitive.Portal>
	<SheetPrimitive.Overlay data-slot="sheet-overlay" class="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]" />
	<SheetPrimitive.Content
		bind:ref
		data-slot="sheet-content"
		class={cn(
			"bg-card text-card-foreground fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[560px] flex-col border-l shadow-lg outline-none",
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		<SheetPrimitive.Close
			class="hover:bg-muted absolute top-5 right-5 flex size-9 items-center justify-center rounded-lg"
		>
			<XIcon class="size-4" />
			<span class="sr-only">Close</span>
		</SheetPrimitive.Close>
	</SheetPrimitive.Content>
</SheetPrimitive.Portal>
