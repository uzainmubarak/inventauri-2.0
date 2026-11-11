<script lang="ts">
	import ImageIcon from "@lucide/svelte/icons/image";
	import GripIcon from "@lucide/svelte/icons/grip-vertical";
	import UploadIcon from "@lucide/svelte/icons/upload";
	import XIcon from "@lucide/svelte/icons/x";
	import { cn } from "$lib/utils.js";
	import { ImagePicker } from "$lib/ui/image-picker";

	type Img = { id?: string; image_url: string; is_primary?: boolean };

	/**
	 * Photo tiles with a primary marker, "Set primary", remove, and reordering
	 * (drag a tile, or focus its grip and press the left/right arrow keys).
	 * The Upload tile opens the photo gallery (`ImagePicker`), where photos are uploaded
	 * or picked from what is already stored. Props: `images` (bindable).
	 * The first image is always the primary one unless another is chosen.
	 */
	let {
		images = $bindable([]),
		class: className,
	}: {
		images?: Img[];
		class?: string;
	} = $props();

	let picking = $state(false);
	let dragFrom: number | null = $state(null);

	function move(from: number, to: number) {
		if (to < 0 || to >= images.length || from === to) return;
		const next = [...images];
		next.splice(to, 0, next.splice(from, 1)[0]);
		images = next;
	}

	function setPrimary(index: number) {
		images = images.map((img, i) => ({ ...img, is_primary: i === index }));
	}

	function remove(index: number) {
		const removedPrimary = images[index].is_primary;
		const next = images.filter((_, i) => i !== index);
		if (removedPrimary && next.length) next[0] = { ...next[0], is_primary: true };
		images = next;
	}

	function addPicked(picked: { url: string }[]) {
		const have = new Set(images.map((i) => i.image_url));
		const added: Img[] = picked.filter((p) => !have.has(p.url)).map((p) => ({ image_url: p.url }));
		if (!added.length) return;
		const next = [...images, ...added];
		if (!next.some((i) => i.is_primary)) next[0] = { ...next[0], is_primary: true };
		images = next;
	}

	function onGripKey(e: KeyboardEvent, index: number) {
		if (e.key === "ArrowLeft") move(index, index - 1);
		else if (e.key === "ArrowRight") move(index, index + 1);
		else return;
		e.preventDefault();
	}
</script>

<div data-slot="image-uploader" class={cn("flex flex-wrap gap-3", className)}>
	{#each images as img, i (img.id ?? `${i}:${img.image_url}`)}
		<div
			class="flex w-28 flex-col gap-2"
			role="group"
			aria-label="Photo {i + 1}"
			draggable="true"
			ondragstart={() => (dragFrom = i)}
			ondragover={(e) => e.preventDefault()}
			ondrop={() => {
				if (dragFrom !== null) move(dragFrom, i);
				dragFrom = null;
			}}
		>
			<div
				class={cn(
					"bg-muted relative aspect-[3/4] w-28 overflow-hidden rounded-xl",
					img.is_primary && "ring-primary ring-2"
				)}
			>
				{#if img.image_url}
					<img src={img.image_url} alt="" class="size-full object-cover" />
				{:else}
					<div class="text-text-muted flex size-full items-center justify-center">
						<ImageIcon class="size-6" />
					</div>
				{/if}
				{#if img.is_primary}
					<span
						class="bg-primary text-primary-foreground absolute top-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-semibold"
						>Primary</span
					>
				{/if}
				<button
					type="button"
					aria-label="Move photo {i + 1} (arrow keys)"
					class="text-muted-foreground absolute bottom-1.5 left-1.5 flex size-6 cursor-grab items-center justify-center rounded-md bg-card/85"
					onkeydown={(e) => onGripKey(e, i)}
				>
					<GripIcon class="size-3.5" />
				</button>
				<button
					type="button"
					aria-label="Remove photo {i + 1}"
					class="text-muted-foreground hover:text-destructive absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-md bg-card/85"
					onclick={() => remove(i)}
				>
					<XIcon class="size-3.5" />
				</button>
			</div>
			{#if !img.is_primary}
				<button
					type="button"
					class="border-border bg-background hover:bg-muted h-7 rounded-lg border text-xs font-medium"
					onclick={() => setPrimary(i)}
				>
					Set primary
				</button>
			{/if}
		</div>
	{/each}

	<button
		type="button"
		class="border-text-muted text-muted-foreground hover:bg-muted flex aspect-[3/4] w-28 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed text-xs font-medium"
		onclick={() => (picking = true)}
	>
		<UploadIcon class="size-5" />
		Add photos
	</button>
	<ImagePicker bind:open={picking} onSelect={addPicked} />
</div>
