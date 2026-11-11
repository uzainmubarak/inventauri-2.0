<script>
	import { Input } from "$lib/ui/input";
	import { Button } from "$lib/ui/button";
	import { NumberField } from "$lib/ui/number-field";
	import { Field } from "$lib/ui/field";
	import PencilIcon from "@lucide/svelte/icons/pencil";
	import TrashIcon from "@lucide/svelte/icons/trash-2";
	import XIcon from "@lucide/svelte/icons/x";
	import ImageIcon from "@lucide/svelte/icons/image";
	import { newUid } from "$lib/products/options";
	import { ImagePicker } from "$lib/ui/image-picker";

	/**
	 * One option, such as Dupatta style. Closed it reads as a name and its
	 * values; open, every value is a row you can change in place: a photo, the
	 * text and an optional price adjustment.
	 *
	 * Options are the choices a customer makes when ordering. They are not
	 * counted and have no SKU; see docs/stock-module-schema.md.
	 *
	 * Props: `option` (bindable), `issue` (what is wrong with it, if anything),
	 * `onRemove`.
	 * @type {{
	 *   option: import("$lib/products/options").Option,
	 *   issue: string | null,
	 *   onRemove: () => void
	 * }}
	 */
	let { option = $bindable(), issue, onRemove } = $props();

	// The value whose photo is being chosen; one gallery dialog serves every value.
	let pickingFor = $state(/** @type {import("$lib/products/options").OptionValue | null} */ (null));

	let draft = $state("");
	let nameError = $state(false);

	const nameId = $derived(`option-name-${option.uid}`);
	const draftId = $derived(`option-draft-${option.uid}`);
	const GRID = "grid grid-cols-[40px_minmax(0,1fr)_minmax(0,190px)_36px] items-center gap-2";

	// A just-added option opens with its name field ready.
	$effect(() => {
		if (option.fresh) {
			option.fresh = false;
			queueMicrotask(() => document.getElementById(option.name ? draftId : nameId)?.focus());
		}
	});

	/** @param {number} n */
	const money = (n) => Number(n).toLocaleString();

	/** @param {string} text */
	function addValues(text) {
		const added = text
			.split(/[,\n]/)
			.map((t) => t.trim())
			.filter(Boolean)
			.map((value) => ({ uid: newUid(), value, price_adjustment: 0, image_url: null }));
		if (added.length) option.values = [...option.values, ...added];
	}

	function commitDraft() {
		if (draft.trim()) addValues(draft);
		draft = "";
	}

	/** @param {number} i */
	function removeValue(i) {
		option.values = option.values.filter((_, vi) => vi !== i);
	}

	function focusDraft() {
		document.getElementById(draftId)?.focus();
	}

	function done() {
		const empty = !option.name.trim() && !option.values.some((v) => v.value.trim());
		if (empty) return onRemove();
		if (!option.name.trim()) {
			nameError = true;
			document.getElementById(nameId)?.focus();
			return;
		}
		commitDraft();
		option.editing = false;
	}
</script>

{#snippet photo(/** @type {import("$lib/products/options").OptionValue} */ value)}
	{#if value.image_url}
		<span class="relative inline-flex size-10 shrink-0">
			<img src={value.image_url} alt="" class="ring-border size-10 rounded-[10px] object-cover ring-1" />
			<button
				type="button"
				aria-label="Remove the photo of {value.value || 'this value'}"
				class="absolute -top-1.5 -right-1.5 flex size-[18px] items-center justify-center rounded-full bg-[var(--sidebar-bg)] text-white"
				onclick={() => (value.image_url = null)}
			>
				<XIcon class="size-2.5" />
			</button>
		</span>
	{:else}
		<button
			type="button"
			aria-label="Add a photo for {value.value || 'this value'}"
			class="border-text-muted text-muted-foreground hover:bg-muted flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-dashed"
			onclick={() => (pickingFor = value)}
		>
			<ImageIcon class="size-4" />
		</button>
	{/if}
{/snippet}

{#if option.editing}
	<div
		class="border-primary ring-primary flex flex-col gap-[18px] rounded-xl border p-5 ring-1"
		role="group"
		aria-label="Edit option {option.name || ''}"
	>
		<Field
			label="Option name"
			for={nameId}
			error={issue ?? (nameError && !option.name.trim() ? "Give this option a name." : null)}
		>
			<Input
				id={nameId}
				bind:value={option.name}
				placeholder="e.g. Dupatta style"
				aria-invalid={Boolean(issue)}
				oninput={() => (nameError = false)}
				onkeydown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						focusDraft();
					}
				}}
			/>
		</Field>

		<div class="flex flex-col gap-2">
			<div class="{GRID} text-muted-foreground text-xs font-medium">
				<span>Photo</span><span>Values</span><span>Price adjustment</span><span></span>
			</div>
			{#each option.values as value, vi (value.uid)}
				<div class={GRID}>
					{@render photo(value)}
					<Input
						aria-label="Value {vi + 1} of {option.name || 'this option'}"
						bind:value={value.value}
						onkeydown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								focusDraft();
							}
						}}
					/>
					<NumberField
						prefix="+ PKR"
						step="0.01"
						placeholder="0"
						aria-label="Price adjustment for {value.value || 'this value'}"
						bind:value={value.price_adjustment}
					/>
					<Button variant="ghost" size="icon" aria-label="Remove {value.value || 'this value'}" onclick={() => removeValue(vi)}>
						<XIcon />
					</Button>
				</div>
			{/each}
			<div class={GRID}>
				<button
					type="button"
					disabled
					aria-label="Add a photo for the next value"
					class="border-text-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-dashed opacity-50"
				>
					<ImageIcon class="size-4" />
				</button>
				<Input
					id={draftId}
					aria-label="Add another value to {option.name || 'this option'}"
					placeholder="Add another value"
					bind:value={draft}
					onkeydown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							commitDraft();
						}
					}}
					onpaste={(e) => {
						const text = e.clipboardData?.getData("text") ?? "";
						if (/[,\n]/.test(text)) {
							e.preventDefault();
							addValues(text);
						}
					}}
					onblur={commitDraft}
				/>
				<NumberField prefix="+ PKR" placeholder="0" disabled aria-label="Price adjustment for the next value" />
				<span></span>
			</div>
		</div>

		<p class="text-muted-foreground text-[13px]">
			Press Enter to add the next value. Paste a list like “Full, Half” to add several at once. A photo shows the
			customer what the choice looks like.
		</p>

		<div class="flex items-center justify-between">
			<Button variant="ghost" class="text-destructive" onclick={onRemove}><TrashIcon />Delete option</Button>
			<Button variant="secondary" onclick={done}>Done</Button>
		</div>
	</div>
{:else}
	<button
		type="button"
		aria-expanded="false"
		class="hover:bg-background border-border flex w-full items-center gap-4 rounded-xl border px-4 py-3.5 text-left"
		onclick={() => (option.editing = true)}
	>
		<span class="flex min-w-0 flex-1 flex-col gap-2.5">
			<span class="text-sm font-semibold">{option.name}</span>
			<span class="flex flex-wrap gap-2">
				{#each option.values.filter((v) => v.value.trim()) as value (value.uid)}
					<span
						class="bg-secondary flex h-8 items-center gap-2 rounded-full pr-3 text-[13px] font-medium {value.image_url ? 'pl-1' : 'pl-3'}"
					>
						{#if value.image_url}<img src={value.image_url} alt="" class="ring-border size-6 rounded-full object-cover ring-1" />{/if}
						{value.value}
						{#if Number(value.price_adjustment)}
							<span class="text-muted-foreground font-mono text-xs">+ PKR {money(Number(value.price_adjustment))}</span>
						{/if}
					</span>
				{/each}
			</span>
			{#if issue}<span class="text-destructive text-[13px] font-normal">{issue}</span>{/if}
		</span>
		<span class="flex h-8 items-center gap-1.5 px-2.5 text-sm font-medium"><PencilIcon class="size-4" />Edit</span>
	</button>
{/if}

<ImagePicker
	bind:open={() => pickingFor !== null, (o) => { if (!o) pickingFor = null; }}
	multiple={false}
	onSelect={([picked]) => {
		if (pickingFor && picked) pickingFor.image_url = picked.url;
	}}
/>
