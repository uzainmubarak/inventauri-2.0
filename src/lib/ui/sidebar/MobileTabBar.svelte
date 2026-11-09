<script lang="ts">
	import { page } from "$app/state";

	const TABS = [
		{ name: "Dashboard", link: "/", icon: "📊" },
		{ name: "Orders", link: "/orders", icon: "🛒" },
		{ name: "Products", link: "/products", icon: "👗" },
		{ name: "Karigar", link: "/karigar-dashboard", icon: "🙍‍♂️" },
	];

	const MORE_ITEMS = [
		{ name: "Design Library", link: "/design-library", icon: "🧑‍🎨" },
		{ name: "Contacts", link: "/contacts", icon: "📒" },
		{ name: "Agent Ledger", link: "/agent-ledger", icon: "🧾" },
		{ name: "Settings", link: "/settings", icon: "⚙️" },
	];

	let moreOpen = $state(false);
</script>

<nav class="mobile-tab-bar">
	{#each TABS as tab}
		<a href={tab.link} class="tab-item" class:active={page.url.pathname === tab.link}>
			<span class="tab-icon">{tab.icon}</span>
			<span class="tab-label">{tab.name}</span>
		</a>
	{/each}
	<button type="button" class="tab-item" onclick={() => (moreOpen = true)}>
		<span class="tab-icon">⋯</span>
		<span class="tab-label">More</span>
	</button>
</nav>

{#if moreOpen}
	<div class="more-sheet-overlay" onclick={() => (moreOpen = false)}></div>
	<div class="more-sheet">
		<div class="more-sheet-header">
			<span>More</span>
			<button type="button" onclick={() => (moreOpen = false)}>×</button>
		</div>
		{#each MORE_ITEMS as item}
			<a href={item.link} class="more-item" onclick={() => (moreOpen = false)}>
				<span class="tab-icon">{item.icon}</span>
				{item.name}
			</a>
		{/each}
	</div>
{/if}

<style>
	.mobile-tab-bar {
		display: none;
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 60px;
		background: var(--sidebar-bg);
		align-items: center;
		justify-content: space-around;
		z-index: 150;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	@media (max-width: 767px) {
		.mobile-tab-bar {
			display: flex;
		}
	}

	.tab-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		color: var(--sidebar-text);
		text-decoration: none;
		font-size: 9px;
		background: none;
		border: none;
		cursor: pointer;
		font-family: 'DM Sans', sans-serif;
	}

	.tab-item.active {
		color: var(--gold);
	}

	.tab-icon {
		font-size: 18px;
	}

	.more-sheet-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.3);
		z-index: 151;
	}

	.more-sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--sidebar-bg);
		border-radius: 16px 16px 0 0;
		z-index: 152;
		padding: 8px 0 20px;
	}

	.more-sheet-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 20px;
		color: #fff;
		font-size: 13px;
		font-weight: 500;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.more-sheet-header button {
		background: none;
		border: none;
		color: var(--sidebar-text);
		font-size: 18px;
		cursor: pointer;
	}

	.more-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 20px;
		color: var(--sidebar-text);
		text-decoration: none;
		font-size: 13px;
	}
</style>
