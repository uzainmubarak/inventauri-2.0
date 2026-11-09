<script>
	/** @type {{ dresses: any[], onSelect: (dress: any) => void }} */
	let { dresses, onSelect } = $props();

	import StockDressCard from "./StockDressCard.svelte";
</script>

{#if dresses.length === 0}
	<p class="empty-state">No stock dresses match your filters.</p>
{:else}
	<div class="stock-grid">
		{#each dresses as dress (dress.id)}
			<StockDressCard {dress} {onSelect} />
		{/each}
	</div>
{/if}

<style>
	.stock-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 14px;
	}

	.empty-state {
		color: var(--text-muted);
		font-size: 13px;
		padding: 40px 0;
		text-align: center;
	}

	@media (max-width: 1023px) {
		.stock-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 767px) {
		.stock-grid {
			grid-template-columns: 1fr;
			gap: 12px;
		}
	}
</style>
