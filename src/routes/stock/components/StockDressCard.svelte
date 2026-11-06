<script>
	import { effectivePrice } from "$lib/stock/pricing";
	import { availabilityState, availabilityLabel } from "$lib/stock/availability";

	/** @type {{ dress: any, onSelect: (dress: any) => void }} */
	let { dress, onSelect } = $props();

	const activeVariants = $derived(
		(dress.stock_dress_variants ?? []).filter((v) => v.status !== "archived"),
	);

	const totalQuantity = $derived(
		activeVariants.length > 0
			? activeVariants.reduce(
					/** @param {number} sum @param {any} v */ (sum, v) => sum + (v.quantity ?? 0),
					0,
				)
			: (dress.quantity ?? 0),
	);

	const state = $derived(availabilityState(dress, totalQuantity));

	const primaryImage = $derived(
		dress.stock_dress_images?.find((img) => img.is_primary) ?? dress.stock_dress_images?.[0],
	);

	// "Starting from": the cheapest a buyer could actually pay for this
	// design, across its variants. With no variants it is just the price.
	const displayPrice = $derived.by(() => {
		if (activeVariants.length === 0) return Number(dress.price);
		return Math.min(...activeVariants.map((v) => effectivePrice(dress, v)));
	});

	const categoryLabel = $derived(
		dress.subcategory
			? `${formatLabel(dress.category)} · ${formatLabel(dress.subcategory)}`
			: formatLabel(dress.category),
	);

	function formatLabel(value) {
		return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
	}
</script>

<button type="button" class="stock-card" onclick={() => onSelect(dress)}>
	<div class="card-image">
		{#if primaryImage}
			<img src={primaryImage.image_url} alt={dress.name} />
		{:else}
			<div class="card-image-placeholder">👗</div>
		{/if}
	</div>
	<div class="card-body">
		<div class="card-name">{dress.name}</div>
		<div class="card-meta">{categoryLabel}</div>
		<div class="card-footer">
			<span class="card-prices">
				<span class="card-price">PKR {Number(displayPrice).toLocaleString()}</span>
				{#if dress.compare_at_price}
					<span class="card-compare-at">PKR {Number(dress.compare_at_price).toLocaleString()}</span>
				{/if}
			</span>
			<span class="status-badge status-{state}">{availabilityLabel(state)}</span>
		</div>
		{#if dress.tags?.length}
			<div class="card-tags">
				{#each dress.tags.slice(0, 3) as tag}
					<span class="card-tag">{tag}</span>
				{/each}
			</div>
		{/if}
	</div>
</button>

<style>
	.stock-card {
		display: flex;
		flex-direction: column;
		background: var(--white);
		border: 1px solid var(--border);
		border-radius: 12px;
		overflow: hidden;
		box-shadow: var(--shadow);
		cursor: pointer;
		text-align: left;
		padding: 0;
		font-family: 'DM Sans', sans-serif;
		transition: transform 0.1s, box-shadow 0.1s;
	}

	.stock-card:hover {
		box-shadow: var(--shadow-lg);
	}

	.card-image {
		height: 140px;
		background: var(--bg2);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.card-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.card-image-placeholder {
		font-size: 32px;
		opacity: 0.5;
	}

	.card-body {
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.card-name {
		font-weight: 500;
		font-size: 13px;
		color: var(--text);
	}

	.card-meta {
		font-size: 11px;
		color: var(--text-muted);
	}

	.card-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 6px;
	}

	.card-prices {
		display: flex;
		align-items: baseline;
		gap: 6px;
	}

	.card-price {
		font-size: 13px;
		font-weight: 500;
		color: #8b6914;
	}

	.card-compare-at {
		font-size: 11px;
		color: var(--text-faint);
		text-decoration: line-through;
	}

	.card-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: 6px;
	}

	.card-tag {
		font-size: 10px;
		color: var(--text-muted);
		background: var(--bg2);
		border-radius: 8px;
		padding: 2px 7px;
	}

	.status-badge {
		font-size: 10px;
		font-weight: 500;
		padding: 2px 8px;
		border-radius: 10px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.status-in_stock {
		background: var(--green-dim);
		color: var(--green);
		border: 1px solid rgba(58, 107, 74, 0.18);
	}

	.status-made_to_order {
		background: var(--gold-dim);
		color: #8b6914;
		border: 1px solid var(--gold-mid);
	}

	.status-sold_out {
		background: var(--error-dim);
		color: var(--error);
		border: 1px solid rgba(139, 58, 58, 0.18);
	}

	.status-archived {
		background: #f0efed;
		color: #6b6560;
		border: 1px solid #ddd9d3;
	}

	.status-draft {
		background: var(--blue-dim, rgba(58, 74, 107, 0.08));
		color: #3a4a6b;
		border: 1px solid rgba(58, 74, 107, 0.2);
	}

	/* Mobile: horizontal layout, image left, details right */
	@media (max-width: 767px) {
		.stock-card {
			flex-direction: row;
		}

		.card-image {
			width: 100px;
			height: auto;
		}

		.card-body {
			flex: 1;
			justify-content: center;
		}
	}
</style>
