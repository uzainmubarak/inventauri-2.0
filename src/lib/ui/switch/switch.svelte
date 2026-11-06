<script lang="ts">
	import { Switch as SwitchPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<SwitchPrimitive.RootProps> = $props();
</script>

<SwitchPrimitive.Root
	bind:ref
	bind:checked
	data-slot="switch"
	class={cn(
		"peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-colors outline-none data-[state=unchecked]:border-text-muted data-[state=unchecked]:bg-border-light data-[state=checked]:border-primary data-[state=checked]:bg-primary focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
		className
	)}
	{...restProps}
>
	<SwitchPrimitive.Thumb
		data-slot="switch-thumb"
		class="pointer-events-none block size-3.5 rounded-full transition-transform data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-text-muted data-[state=checked]:translate-x-4 data-[state=checked]:bg-white"
	/>
</SwitchPrimitive.Root>
