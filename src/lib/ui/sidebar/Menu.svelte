<script>
    import MenuItem from "./MenuItem.svelte";

    let { label, items } = $props();
</script>

<div class="sidebar-section">
    <div class="sidebar-label">{label}</div>
    <div class="menu-items">
        {#each items as item}
            <MenuItem {...item} />
        {/each}
    </div>
</div>

<style>
    .sidebar-section {
        padding: 20px 0 8px;
    }

    .sidebar-label {
        font-size: 9px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.22);
        font-weight: 500;
        padding: 0 24px;
        margin-bottom: 4px;
    }

    .menu-items {
        display: flex;
        flex-direction: column;
    }
</style>
