<script>
	import { Input } from "$lib/ui/input";
	import { Button } from "$lib/ui/button";
	import { NumberField } from "$lib/ui/number-field";
	import { Field } from "$lib/ui/field";
	import TrashIcon from "@lucide/svelte/icons/trash-2";
	import XIcon from "@lucide/svelte/icons/x";

	/**
	 * One option, such as "Dupatta style": a name and the choices a customer
	 * picks from, each with an optional price adjustment. Options are chosen
	 * at order time. They are not counted and have no SKU.
	 * Props: `option` (bindable: { name, values, newValue, newAdjustment }),
	 * `index` (keeps ids unique), `onRemove`.
	 * @type {{
	 *   option: { name: string, values: { value: string, price_adjustment?: number }[], newValue: string, newAdjustment: string | number },
	 *   index: number,
	 *   onRemove: () => void
	 * }}
	 */
	let { option = $bindable(), index, onRemove } = $props();

	function addValue() {
		const value = option.newValue?.trim();
		if (!value) return;
		option.values = [...option.values, { value, price_adjustment: Number(option.newAdjustment) || 0 }];
		option.newValue = "";
		option.newAdjustment = "";
	}

	/** @param {number} i */
	function removeValue(i) {
		option.values = option.values.filter((_, vi) => vi !== i);
	}

	/** @param {number} n */
	const money = (n) => Number(n).toLocaleString();
</script>

<div class="border-border flex flex-col gap-4 rounded-xl border p-4">
	<div class="flex items-end gap-3">
		<Field label="Option name" for="option-name-{index}" class="flex-1">
			<Input id="option-name-{index}" bind:value={option.name} placeholder="e.g. Dupatta style" />
		</Field>
		<Button variant="ghost" size="icon" class="text-destructive" aria-label="Remove option {option.name}" onclick={onRemove}>
			<TrashIcon />
		</Button>
	</div>

	{#if option.values.length}
		<div class="flex flex-wrap gap-2">
			{#each option.values as value, vi (vi)}
				<span class="bg-secondary flex h-8 items-center gap-2 rounded-full pr-1.5 pl-3 text-[13px] font-medium">
					{value.value}
					{#if Number(value.price_adjustment)}
						<span class="text-muted-foreground font-mono text-xs">+ PKR {money(value.price_adjustment ?? 0)}</span>
					{/if}
					<button
						type="button"
						aria-label="Remove {value.value}"
						class="text-muted-foreground hover:text-foreground flex size-5 items-center justify-center rounded-full"
						onclick={() => removeValue(vi)}
					>
						<XIcon class="size-2.5" />
					</button>
				</span>
			{/each}
		</div>
	{/if}

	<div class="flex flex-wrap items-center gap-2">
		<Input
			class="min-w-40 flex-1"
			aria-label="Choice for {option.name || 'this option'}"
			placeholder="Choice, e.g. Hand-painted"
			bind:value={option.newValue}
			onkeydown={(e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					addValue();
				}
			}}
		/>
		<NumberField
			class="w-44"
			prefix="+ PKR"
			step="0.01"
			aria-label="Price adjustment"
			placeholder="0"
			bind:value={option.newAdjustment}
		/>
		<Button variant="outline" onclick={addValue}>Add choice</Button>
	</div>
</div>
