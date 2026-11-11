<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import SearchIcon from "@lucide/svelte/icons/search";
	import TrashIcon from "@lucide/svelte/icons/trash-2";
	import { Button } from "$lib/ui/button";
	import { Input } from "$lib/ui/input";
	import * as Dialog from "$lib/ui/dialog";
	import { cn } from "$lib/utils.js";
	import {
		deleteUploadedImage,
		listUploadedImages,
		listUsedImageUrls,
		uploadImage,
	} from "$lib/services/uploadedImagesService";

	type Gallery = { id: string; r2_key: string; url: string; file_name: string | null; created_at: string };
	type Pending = { key: number; file: File; status: "uploading" | "failed"; error?: string };

	/**
	 * The photo gallery: everything already in the R2 bucket, with an Upload tile
	 * first. New files stack at the front while they upload; a file that is already
	 * in the gallery is not uploaded again, it is selected instead. Photos still in
	 * use can't be deleted; others are deleted from the bucket too.
	 * Props: `open` (bindable), `multiple` (default true), `onSelect(images)`.
	 */
	let {
		open = $bindable(false),
		multiple = true,
		onSelect,
	}: { open?: boolean; multiple?: boolean; onSelect?: (images: Gallery[]) => void } = $props();

	let gallery: Gallery[] = $state([]);
	let used = $state(new Set<string>());
	let loading = $state(false);
	let error: string | null = $state(null);
	let notice: string | null = $state(null);
	let query = $state("");
	let sort: "newest" | "oldest" = $state("newest");
	let pending: Pending[] = $state([]);
	let selected = $state(new Set<string>());
	let fresh = $state(new Map<string, "New" | "Already here">());
	let toDelete: Gallery | null = $state(null);
	let deleting = $state(false);
	let fileInput: HTMLInputElement | undefined = $state();
	let nextKey = 0;

	const shown = $derived(
		gallery
			.filter((g) => (g.file_name ?? "").toLowerCase().includes(query.trim().toLowerCase()))
			.sort((a, b) => (sort === "newest" ? -1 : 1) * a.created_at.localeCompare(b.created_at))
	);
	const uploading = $derived(pending.filter((p) => p.status === "uploading").length);

	$effect(() => {
		if (!open) return;
		selected = new Set();
		fresh = new Map();
		pending = [];
		notice = error = null;
		load();
	});

	async function load() {
		loading = true;
		const [g, u] = await Promise.all([listUploadedImages(), listUsedImageUrls()]);
		loading = false;
		if (g.error || u.error) return (error = g.error ?? u.error);
		gallery = g.data ?? [];
		used = u.data ?? new Set();
	}

	function toggle(id: string) {
		const next = new Set(multiple ? selected : []);
		if (selected.has(id)) next.delete(id);
		else next.add(id);
		selected = next;
	}

	async function send(p: Pending) {
		p.status = "uploading";
		const { data, error: err } = await uploadImage(p.file);
		if (err || !data) {
			p.status = "failed";
			p.error = err ?? "Upload failed";
			return;
		}
		pending = pending.filter((x) => x.key !== p.key);
		const { image, duplicate } = data;
		if (!gallery.some((g) => g.id === image.id)) gallery = [image, ...gallery];
		fresh = new Map(fresh).set(image.id, duplicate ? "Already here" : "New");
		if (duplicate) notice = `${p.file.name} was already in your gallery, so it wasn't uploaded again. It is selected for you.`;
		const next = new Set(multiple ? selected : []);
		next.add(image.id);
		selected = next;
	}

	function addFiles(files: File[]) {
		const added = files.map((file) => ({ key: nextKey++, file, status: "uploading" as const }));
		pending = [...added, ...pending];
		// Re-read through the state proxies so later status changes re-render.
		for (const a of added) send(pending.find((p) => p.key === a.key)!);
	}

	async function confirmDelete() {
		if (!toDelete) return;
		deleting = true;
		const { error: err } = await deleteUploadedImage(toDelete);
		deleting = false;
		if (err) return (error = err);
		const id = toDelete.id;
		gallery = gallery.filter((g) => g.id !== id);
		selected = new Set([...selected].filter((x) => x !== id));
		toDelete = null;
	}

	function use() {
		onSelect?.(gallery.filter((g) => selected.has(g.id)));
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-[640px] gap-4">
		<Dialog.Header>
			<Dialog.Title>Choose photos</Dialog.Title>
			<Dialog.Description>Everything you have uploaded is here. Pick one, or add new photos.</Dialog.Description>
		</Dialog.Header>

		<div class="flex gap-2">
			<div class="relative flex-1">
				<SearchIcon class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
				<Input class="pl-9" placeholder="Search by file name" aria-label="Search photos" bind:value={query} />
			</div>
			<select
				aria-label="Sort photos"
				class="border-border bg-background h-9 rounded-lg border px-3 text-sm"
				bind:value={sort}
			>
				<option value="newest">Newest first</option>
				<option value="oldest">Oldest first</option>
			</select>
		</div>

		{#if notice}
			<p role="status" class="bg-muted text-foreground rounded-lg px-3 py-2 text-[13px]">{notice}</p>
		{/if}
		{#if error}
			<p role="alert" class="text-destructive text-[13px]">{error}</p>
		{/if}

		<div
			class="grid max-h-[420px] grid-cols-4 gap-3 overflow-y-auto p-1"
			role="presentation"
			ondragover={(e) => e.preventDefault()}
			ondrop={(e) => {
				e.preventDefault();
				addFiles(Array.from(e.dataTransfer?.files ?? []));
			}}
		>
			<button
				type="button"
				class="border-text-muted text-muted-foreground hover:bg-muted flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-xs font-medium"
				onclick={() => fileInput?.click()}
			>
				<PlusIcon class="size-5" />
				Upload
				<span class="text-[11px] font-normal">or drop here</span>
			</button>

			{#each pending as p (p.key)}
				<div
					class={cn(
						"relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-xl p-2 text-center text-xs",
						p.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
					)}
				>
					{#if p.status === "failed"}
						<span class="font-medium">Upload failed</span>
						<span class="line-clamp-2 text-[11px]">{p.error}</span>
						<button type="button" class="font-semibold underline" onclick={() => send(p)}>Retry</button>
					{:else}
						<span class="max-w-full truncate">{p.file.name}</span>
						<span>Uploading…</span>
						<span class="bg-border absolute inset-x-0 bottom-0 h-1 overflow-hidden">
							<span class="bg-primary block h-full w-1/3 animate-pulse"></span>
						</span>
					{/if}
				</div>
			{/each}

			{#each shown as g (g.id)}
				{@const isUsed = used.has(g.url)}
				<div class="group relative flex flex-col gap-1">
					<button
						type="button"
						aria-pressed={selected.has(g.id)}
						aria-label="{selected.has(g.id) ? 'Deselect' : 'Select'} {g.file_name ?? 'photo'}"
						class={cn(
							"bg-muted relative aspect-square overflow-hidden rounded-xl",
							selected.has(g.id) && "ring-primary ring-2"
						)}
						onclick={() => toggle(g.id)}
					>
						<img src={g.url} alt="" class="size-full object-cover" loading="lazy" />
						{#if selected.has(g.id)}
							<span class="bg-primary text-primary-foreground absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full">
								<CheckIcon class="size-3" />
							</span>
						{/if}
						{#if fresh.get(g.id)}
							<span class="bg-primary text-primary-foreground absolute bottom-1.5 left-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold">{fresh.get(g.id)}</span>
						{:else if isUsed}
							<span class="bg-card/90 absolute bottom-1.5 left-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium">In use</span>
						{/if}
					</button>
					<button
						type="button"
						aria-label="Delete {g.file_name ?? 'photo'}"
						title={isUsed ? "In use. Remove it from the dress or option first." : "Delete from the gallery and storage"}
						disabled={isUsed}
						class="text-muted-foreground hover:text-destructive bg-card/90 absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-md opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 disabled:hidden"
						onclick={() => (toDelete = g)}
					>
						<TrashIcon class="size-3.5" />
					</button>
					<span class="text-muted-foreground truncate text-[11px]">{g.file_name}</span>
				</div>
			{/each}
		</div>
		{#if !loading && !shown.length && !pending.length}
			<p class="text-muted-foreground text-center text-[13px]">
				{query ? "No photos match that name." : "No photos yet. Upload your first one."}
			</p>
		{/if}

		<input
			bind:this={fileInput}
			type="file"
			accept="image/*"
			{multiple}
			hidden
			onchange={(e) => {
				addFiles(Array.from(e.currentTarget.files ?? []));
				e.currentTarget.value = "";
			}}
		/>

		<Dialog.Footer class="items-center">
			<span class="text-muted-foreground mr-auto text-[13px]">
				{selected.size} selected{uploading ? ` · ${uploading} uploading` : ""}
			</span>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button disabled={!selected.size || uploading > 0} onclick={use}>
				{selected.size === 1 ? "Use photo" : `Use ${selected.size || ""} photos`.replace("  ", " ")}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root open={toDelete !== null} onOpenChange={(o) => !o && (toDelete = null)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete this photo?</Dialog.Title>
			<Dialog.Description>
				{toDelete?.file_name ?? "This photo"} will be removed from the gallery and deleted from storage. This can't be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (toDelete = null)}>Cancel</Button>
			<Button variant="destructive" disabled={deleting} onclick={confirmDelete}>Delete</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
