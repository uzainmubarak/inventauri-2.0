<script lang="ts">
	import ImageIcon from "@lucide/svelte/icons/image";
	import GripIcon from "@lucide/svelte/icons/grip-vertical";
	import UploadIcon from "@lucide/svelte/icons/upload";
	import XIcon from "@lucide/svelte/icons/x";
	import { cn } from "$lib/utils.js";

	type Img = { id?: string; image_url: string; is_primary?: boolean };

	/**
	 * Photo tiles with a primary marker, "Set primary", remove, and reordering
	 * (drag a tile, or focus its grip and press the left/right arrow keys).
	 * Props: `images` (bindable), `onFiles` (called with chosen files),
	 * `uploadDisabled` + `uploadHint` (turn the Upload tile off and say why).
	 * The first image is always the primary one unless another is chosen.
	 */
	let {
		images = $bindable([]),
		onFiles,
		uploadDisabled = false,
		uploadHint,
		class: className,
	}: {
		images?: Img[];
		onFiles?: (files: File[]) => void;
		uploadDisabled?: boolean;
		uploadHint?: string;
		class?: string;
	} = $props();

	let fileInput: HTMLInputElement | undefined = $state();
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
					"bg-muted relative size-28 overflow-hidden rounded-xl",
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
					class="text-muted-foreground absolute bottom-1.5 left-1.5 flex size-6 cursor-grab items-center justify-center rounded-md bg-white/85"
					onkeydown={(e) => onGripKey(e, i)}
				>
					<GripIcon class="size-3.5" />
				</button>
				<button
					type="button"
					aria-label="Remove photo {i + 1}"
					class="text-muted-foreground hover:text-destructive absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-md bg-white/85"
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
		disabled={uploadDisabled}
		title={uploadDisabled ? uploadHint : undefined}
		class="border-text-muted text-muted-foreground hover:bg-muted flex size-28 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
		onclick={() => fileInput?.click()}
	>
		<UploadIcon class="size-5" />
		Upload
	</button>
	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		multiple
		hidden
		onchange={(e) => {
			onFiles?.(Array.from(e.currentTarget.files ?? []));
			e.currentTarget.value = "";
		}}
	/>
</div>
{#if uploadDisabled && uploadHint}
	<p class="text-muted-foreground mt-2 text-[13px]">{uploadHint}</p>
{/if}
