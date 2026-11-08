<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils.js";

	/**
	 * Centered "nothing here" block. Props: `title`, `description`, optional
	 * `icon` snippet (drawn inside a gold circle) and `children` (the action).
	 */
	let {
		title,
		description,
		icon,
		children,
		class: className,
	}: {
		title: string;
		description?: string;
		icon?: Snippet;
		children?: Snippet;
		class?: string;
	} = $props();
</script>

<div
	data-slot="empty-state"
	class={cn("flex flex-col items-center gap-3 px-8 py-12 text-center", className)}
>
	{#if icon}
		<div class="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-full">
			{@render icon()}
		</div>
	{/if}
	<div class="text-base font-semibold">{title}</div>
	{#if description}
		<p class="text-muted-foreground max-w-xs text-sm leading-relaxed">{description}</p>
	{/if}
	{#if children}
		<div class="mt-1">{@render children()}</div>
	{/if}
</div>
