<script>
	import { getStockDressById, archiveStockDress } from "$lib/services/stockDressesService";
	import VariantList from "./VariantList.svelte";

	// Read-only detail view. Editing (including publishing a draft) lives at
	// its own page, /stock/[id]/edit — see that route and
	// StockDressFormFields.svelte for why: the edit flow needs the same
	// scope as create (images, options, variants), which didn't fit in a
	// 500px side panel.
	/**
	 * @type {{
	 *   dress: any,
	 *   onClose: () => void,
	 *   onSaved: () => void
	 * }}
	 */
	let { dress, onClose, onSaved } = $props();

	let fullDress = $state(null);
	let loading = $state(true);
	let error = $state(null);

	$effect(() => {
		loadFullDress(dress.id);
	});

	async function loadFullDress(id) {
		loading = true;
		const { data, error: fetchError } = await getStockDressById(id);
		loading = false;
		if (fetchError) {
			error = fetchError;
			return;
		}
		fullDress = data;
	}

	async function handleArchive() {
		if (!fullDress) return;
		const { error: archiveError } = await archiveStockDress(fullDress.id);
		if (archiveError) {
			error = archiveError;
			return;
		}
		onSaved();
	}

	function formatLabel(value) {
		return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
	}
</script>

<div class="drawer-overlay open" onclick={onClose}></div>
<div class="detail-drawer open">
	<div class="drawer-header">
		<div>
			{#if fullDress}
				<div class="drawer-id">{fullDress.sku}</div>
				<div class="drawer-title">{fullDress.name}</div>
			{/if}
		</div>
		<button type="button" class="drawer-close" onclick={onClose}>×</button>
	</div>

	<div class="drawer-body">
		{#if loading}
			<p>Loading…</p>
		{:else if error}
			<p class="error-text">Error: {error}</p>
		{:else if fullDress}
			<div class="drawer-images">
				{#each fullDress.stock_dress_images ?? [] as img}
					<img src={img.image_url} alt={fullDress.name} />
				{/each}
				{#if !fullDress.stock_dress_images?.length}
					<div class="drawer-image-placeholder">👗</div>
				{/if}
			</div>

			<div class="drawer-info-grid">
				<div class="info-cell"><span class="info-label">Category</span>{formatLabel(fullDress.category)}{fullDress.subcategory ? ` / ${formatLabel(fullDress.subcategory)}` : ""}</div>
				<div class="info-cell"><span class="info-label">Status</span>{formatLabel(fullDress.status)}</div>
				<div class="info-cell"><span class="info-label">Base Price</span>PKR {Number(fullDress.base_price).toLocaleString()}</div>
				<div class="info-cell"><span class="info-label">Garment Type</span>{fullDress.garment_type}</div>
			</div>

			{#if fullDress.notes}
				<p class="drawer-notes">{fullDress.notes}</p>
			{/if}

			{#if fullDress.stock_dress_options?.length}
				<div class="drawer-section-title">Options</div>
				<div class="options-list">
					{#each fullDress.stock_dress_options as option}
						<div class="option-row">
							<span class="option-name">{option.name}</span>
							<span class="option-values">
								{(option.stock_dress_option_values ?? []).map((v) => v.value).join(", ") || "—"}
							</span>
						</div>
					{/each}
				</div>
			{/if}

			<div class="drawer-section-title">Variants</div>
			<VariantList variants={(fullDress.stock_dress_variants ?? []).filter((v) => v.status !== 'archived')} editable={false} />

			<div class="drawer-actions">
				<a href="/stock/{fullDress.id}/edit" class="btn-secondary">Edit</a>
				<button type="button" class="btn-danger" onclick={handleArchive}>Archive</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.drawer-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.2);
		z-index: 200;
		backdrop-filter: blur(2px);
	}

	.detail-drawer {
		position: fixed;
		top: 0;
		right: 0;
		width: 500px;
		height: 100vh;
		background: var(--white);
		border-left: 1px solid var(--border);
		box-shadow: var(--shadow-lg);
		z-index: 201;
		display: flex;
		flex-direction: column;
	}

	.drawer-header {
		padding: 20px 24px;
		border-bottom: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-shrink: 0;
	}

	.drawer-id {
		font-family: 'JetBrains Mono', monospace;
		font-size: 13px;
		color: var(--gold);
		font-weight: 500;
	}

	.drawer-title {
		font-family: 'Playfair Display', serif;
		font-size: 18px;
		font-weight: 500;
		margin-top: 2px;
	}

	.drawer-close {
		width: 28px;
		height: 28px;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: transparent;
		cursor: pointer;
		font-size: 16px;
		color: var(--text-muted);
	}

	.drawer-body {
		flex: 1;
		overflow-y: auto;
		padding: 20px 24px;
	}

	.drawer-images {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		margin-bottom: 16px;
	}

	.drawer-images img {
		width: 120px;
		height: 120px;
		object-fit: cover;
		border-radius: 10px;
		flex-shrink: 0;
	}

	.drawer-image-placeholder {
		width: 100%;
		height: 160px;
		background: var(--bg2);
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 40px;
	}

	.drawer-info-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		border: 1px solid var(--border-light);
		border-radius: 10px;
		overflow: hidden;
		margin-bottom: 20px;
	}

	.info-cell {
		padding: 12px;
		border-bottom: 1px solid var(--border-light);
		border-right: 1px solid var(--border-light);
		font-size: 13px;
	}

	.info-label {
		display: block;
		font-size: 10px;
		color: var(--text-faint);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-bottom: 3px;
	}

	.drawer-notes {
		font-size: 12px;
		color: var(--text-muted);
		margin-bottom: 16px;
	}

	.drawer-section-title {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-faint);
		margin-bottom: 10px;
		margin-top: 20px;
	}

	.options-list {
		border: 1px solid var(--border-light);
		border-radius: 10px;
		overflow: hidden;
	}

	.option-row {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 12px;
		font-size: 12px;
		border-bottom: 1px solid var(--border-light);
	}

	.option-row:last-child {
		border-bottom: none;
	}

	.option-name {
		font-weight: 500;
		flex-shrink: 0;
	}

	.option-values {
		color: var(--text-muted);
		text-align: right;
	}

	.drawer-actions {
		display: flex;
		gap: 10px;
		margin-top: 20px;
	}

	.btn-secondary {
		background: var(--white);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 9px 16px;
		font-size: 12px;
		cursor: pointer;
		text-decoration: none;
		color: var(--text);
		display: inline-flex;
		align-items: center;
	}

	.btn-danger {
		background: var(--error-dim);
		border: 1px solid rgba(139, 58, 58, 0.18);
		color: var(--error);
		border-radius: 8px;
		padding: 9px 16px;
		font-size: 12px;
		cursor: pointer;
	}

	.error-text {
		color: var(--error);
		font-size: 12px;
	}

	/* Mobile: full-screen instead of a 500px side drawer */
	@media (max-width: 767px) {
		.detail-drawer {
			width: 100%;
		}
	}
</style>
