<script>
	import * as Sheet from "$lib/ui/sheet";
	import { Button } from "$lib/ui/button";
	import StatusBadge from "./StatusBadge.svelte";
	import StockDressDetails from "./StockDressDetails.svelte";

	/**
	 * Read-only view of one dress (see StockDressDetails). Edit opens the form.
	 * Props: `dress` (the list row) and `onClose`.
	 * @type {{ dress: any, onClose: () => void }}
	 */
	let { dress, onClose } = $props();

	/** @type {any} */
	let summary = $state(null);
</script>

<Sheet.Root open onOpenChange={(open) => !open && onClose()}>
	<Sheet.Content>
		<Sheet.Header class="flex-row items-start gap-4">
			<div class="flex min-w-0 flex-1 flex-col gap-2">
				<Sheet.Title>{dress.name}</Sheet.Title>
				<Sheet.Description class="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
					<span class="font-mono">{dress.sku}</span>
					<span>{dress.garment_type}</span>
					{#if summary}<StatusBadge state={summary.state} />{/if}
				</Sheet.Description>
			</div>
			<Button variant="outline" href="/products/{dress.id}/edit?edit">Edit</Button>
		</Sheet.Header>

		<div class="flex flex-1 flex-col gap-8 overflow-y-auto px-6 py-6">
			<StockDressDetails dressId={dress.id} bind:summary />
		</div>
	</Sheet.Content>
</Sheet.Root>
