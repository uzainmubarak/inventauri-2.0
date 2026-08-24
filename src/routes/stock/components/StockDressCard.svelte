<script>
	/** @type {{ dress: any, onSelect: (dress: any) => void }} */
	let { dress, onSelect } = $props();

	const primaryImage = $derived(
		dress.stock_dress_images?.find((img) => img.is_primary) ?? dress.stock_dress_images?.[0],
	);

	// "Starting from" price: lowest price_override among non-archived
	// variants, falling back to base_price if none set an override.
	const displayPrice = $derived.by(() => {
		const activeVariants = (dress.stock_dress_variants ?? []).filter((v) => v.status !== "archived");
		const overrides = activeVariants
			.map((v) => v.price_override)
			.filter((p) => p !== null && p !== undefined);
		if (overrides.length === 0) return dress.base_price;
		return Math.min(...overrides);
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
			<span class="card-price">PKR {Number(displayPrice).toLocaleString()}</span>
			<span class="status-badge status-{dress.status}">{formatLabel(dress.status)}</span>
		</div>
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

	.card-price {
		font-size: 13px;
		font-weight: 500;
		color: #8b6914;
	}

	.status-badge {
		font-size: 10px;
		font-weight: 500;
		padding: 2px 8px;
		border-radius: 10px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.status-available {
		background: var(--green-dim);
		color: var(--green);
		border: 1px solid rgba(58, 107, 74, 0.18);
	}

	.status-reserved {
		background: var(--gold-dim);
		color: #8b6914;
		border: 1px solid var(--gold-mid);
	}

	.status-sold {
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
