<script lang="ts">
	import type { Snippet } from "svelte";
	import { Label } from "$lib/ui/label";
	import { cn } from "$lib/utils.js";

	/**
	 * A label, its control and a line of help or error text, stacked.
	 * Props: `label`, `for` (the control's id), `hint`, `error` (replaces the
	 * hint), `children` (the control).
	 */
	let {
		label,
		for: htmlFor,
		hint,
		error,
		children,
		class: className,
	}: {
		label: string;
		for?: string;
		hint?: string;
		error?: string | null;
		children: Snippet;
		class?: string;
	} = $props();
</script>

<div data-slot="field" class={cn("flex min-w-0 flex-col gap-2", className)}>
	<Label for={htmlFor}>{label}</Label>
	{@render children()}
	{#if error}
		<p class="text-destructive text-[13px]">{error}</p>
	{:else if hint}
		<p class="text-muted-foreground text-[13px]">{hint}</p>
	{/if}
</div>
