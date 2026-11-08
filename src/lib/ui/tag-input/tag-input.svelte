<script lang="ts">
	import XIcon from "@lucide/svelte/icons/x";
	import { cn } from "$lib/utils.js";

	/**
	 * Chip input. Enter or a comma adds what is typed, Backspace on an empty
	 * field removes the last chip, and leaving the field keeps unfinished text.
	 * Props: `value` (bindable string[]), `normalise` (optional: trims and
	 * dedupes by default; pass your own to change the rules), `id`, `placeholder`.
	 */
	let {
		value = $bindable([]),
		normalise = dedupe,
		id,
		placeholder = "Add a tag",
		class: className,
	}: {
		value?: string[];
		normalise?: (tags: string[]) => string[];
		id?: string;
		placeholder?: string;
		class?: string;
	} = $props();

	let draft = $state("");

	function dedupe(tags: string[]) {
		const seen = new Set<string>();
		return tags
			.map((t) => t.trim())
			.filter((t) => t && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()));
	}

	function commit() {
		if (draft.trim()) value = normalise([...value, ...draft.split(",")]);
		draft = "";
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === "Enter" || e.key === ",") {
			e.preventDefault();
			commit();
		} else if (e.key === "Backspace" && !draft && value.length) {
			value = value.slice(0, -1);
		}
	}
</script>

<div
	data-slot="tag-input"
	class={cn(
		"border-input focus-within:border-ring focus-within:ring-ring flex min-h-9 w-full flex-wrap items-center gap-2 rounded-lg border px-2 py-1 transition-colors focus-within:ring-1",
		className
	)}
>
	{#each value as tag (tag)}
		<span class="bg-secondary flex h-6 items-center gap-1 rounded-full pr-1 pl-2.5 text-xs font-medium">
			{tag}
			<button
				type="button"
				aria-label="Remove {tag}"
				class="text-muted-foreground hover:text-foreground flex size-[18px] items-center justify-center rounded-full"
				onclick={() => (value = value.filter((t) => t !== tag))}
			>
				<XIcon class="size-2.5" />
			</button>
		</span>
	{/each}
	<input
		{id}
		{placeholder}
		bind:value={draft}
		{onkeydown}
		onblur={commit}
		class="placeholder:text-muted-foreground h-6 min-w-24 flex-1 bg-transparent px-0.5 text-sm outline-none"
	/>
</div>
