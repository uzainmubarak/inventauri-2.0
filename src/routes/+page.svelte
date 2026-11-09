<script>
	import { listStockDresses } from "$lib/services/stockDressesService";

	let dressCount = $state(null);

	$effect(() => {
		listStockDresses().then(({ data }) => {
			dressCount = data?.length ?? 0;
		});
	});
</script>

<div class="topbar">
	<div class="breadcrumb"><span>Dashboard</span></div>
</div>

<div class="content-area">
	<div class="scroll-area">
		<div class="page-header">
			<div>
				<div class="page-title">Golden Studio</div>
				<div class="page-meta">Production management dashboard</div>
			</div>
		</div>

		<div class="summary-card">
			<div class="sc-label">Products</div>
			<div class="sc-value">{dressCount ?? "—"}</div>
		</div>

		<p class="placeholder-note">
			Full dashboard (order summary, production overview) is a future module.
			<a href="/products">Go to Products →</a>
		</p>
	</div>
</div>

<style>
	.topbar {
		background: var(--bg);
		border-bottom: 1px solid var(--border);
		padding: 0 28px;
		height: 56px;
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.breadcrumb span {
		color: var(--text);
		font-weight: 500;
		font-size: 12px;
	}

	.content-area {
		flex: 1;
		overflow: hidden;
	}

	.scroll-area {
		height: 100%;
		overflow-y: auto;
		padding: 24px 28px;
	}

	.page-title {
		font-family: 'Playfair Display', serif;
		font-size: 34px;
		font-weight: 500;
	}

	.page-meta {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 6px;
	}

	.summary-card {
		background: var(--white);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 16px 18px;
		box-shadow: var(--shadow);
		max-width: 200px;
		margin: 22px 0;
	}

	.sc-label {
		font-size: 10px;
		color: var(--text-faint);
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		margin-bottom: 6px;
	}

	.sc-value {
		font-family: 'JetBrains Mono', monospace;
		font-size: 22px;
		font-weight: 500;
	}

	.placeholder-note {
		font-size: 12px;
		color: var(--text-muted);
	}

	.placeholder-note a {
		color: var(--gold);
	}

	@media (max-width: 767px) {
		.scroll-area {
			padding: 16px;
			padding-bottom: 72px;
		}
	}
</style>
