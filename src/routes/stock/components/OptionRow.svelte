<script>
	import { Input } from "$lib/ui/input";
	import { Button } from "$lib/ui/button";
	import { NumberField } from "$lib/ui/number-field";
	import { Field } from "$lib/ui/field";
	import { Combobox } from "$lib/ui/combobox";
	import PencilIcon from "@lucide/svelte/icons/pencil";
	import TrashIcon from "@lucide/svelte/icons/trash-2";
	import XIcon from "@lucide/svelte/icons/x";
	import { newUid, SUGGESTED_OPTIONS } from "$lib/stock/optionVariants";

	/**
	 * One option, such as Size or Colour. Closed it reads as a name and its
	 * values; open, every value is a field you can change in place, each with an
	 * optional price adjustment.
	 *
	 * Props: `option` (bindable), `issue` (what is wrong with it, if anything),
	 * `taken` (option names already used, so they are not suggested again),
	 * `onChange(kind)` where kind is "structure" when the name or a value
	 * changed and "price" when only an adjustment did, `onRemove`.
	 * @type {{
	 *   option: import("$lib/stock/optionVariants").Option,
	 *   issue: string | null,
	 *   taken: string[],
	 *   onChange: (kind: "structure" | "price") => void,
	 *   onRemove: () => void
	 * }}
	 */
	let { option = $bindable(), issue, taken, onChange, onRemove } = $props();

	let draft = $state("");
	let nameError = $state(false);

	const nameId = $derived(`option-name-${option.uid}`);
	const draftId = $derived(`option-draft-${option.uid}`);
	const suggestions = $derived(SUGGESTED_OPTIONS.filter((n) => !taken.includes(n.toLowerCase())));

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
			.map((value) => ({ uid: newUid(), value, price_adjustment: 0 }));
		if (!added.length) return;
		option.values = [...option.values, ...added];
		onChange("structure");
	}

	function commitDraft() {
		if (draft.trim()) addValues(draft);
		draft = "";
	}

	/** @param {number} i */
	function removeValue(i) {
		option.values = option.values.filter((_, vi) => vi !== i);
		onChange("structure");
	}

	/** @param {string} name */
	function useName(name) {
		option.name = name;
		onChange("structure");
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
			<Combobox
				id={nameId}
				bind:value={option.name}
				options={suggestions}
				placeholder="e.g. Size"
				aria-invalid={Boolean(issue)}
				oninput={() => {
					nameError = false;
					onChange("structure");
				}}
				onkeydown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						document.getElementById(draftId)?.focus();
					}
				}}
			/>
			{#if !option.name.trim() && suggestions.length}
				<div class="flex flex-wrap items-center gap-2">
					<span class="text-muted-foreground text-[13px]">Suggestions</span>
					{#each suggestions as name (name)}
						<button
							type="button"
							class="border-border bg-background hover:bg-muted h-7 rounded-full border px-3 text-[13px] font-medium"
							onclick={() => useName(name)}>{name}</button
						>
					{/each}
				</div>
			{/if}
		</Field>

		<div class="flex flex-col gap-2">
			<div class="text-muted-foreground grid grid-cols-[minmax(0,1fr)_minmax(0,200px)_36px] gap-2 text-xs font-medium">
				<span>Values</span><span>Price adjustment</span><span></span>
			</div>
			{#each option.values as value, vi (value.uid)}
				<div class="grid grid-cols-[minmax(0,1fr)_minmax(0,200px)_36px] items-center gap-2">
					<Input
						aria-label="Value {vi + 1} of {option.name || 'this option'}"
						bind:value={value.value}
						oninput={() => onChange("structure")}
						onkeydown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								document.getElementById(draftId)?.focus();
							}
						}}
					/>
					<NumberField
						prefix="+ PKR"
						step="0.01"
						placeholder="0"
						aria-label="Price adjustment for {value.value || 'this value'}"
						bind:value={value.price_adjustment}
						oninput={() => onChange("price")}
					/>
					<Button variant="ghost" size="icon" aria-label="Remove {value.value || 'this value'}" onclick={() => removeValue(vi)}>
						<XIcon />
					</Button>
				</div>
			{/each}
			<div class="grid grid-cols-[minmax(0,1fr)_minmax(0,200px)_36px] items-center gap-2">
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
			Press Enter to add the next value. Paste a list like “S, M, L” to add several at once.
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
					<span class="bg-secondary flex h-7 items-center gap-2 rounded-full px-3 text-[13px] font-medium">
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
