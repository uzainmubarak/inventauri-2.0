<script lang="ts">
    import { page } from '$app/state';

    const { link, name, icon, badge } = $props();

    let isActive = $derived(page.url.pathname === link);
</script>

<a href={link} class="nav-item" class:active={isActive}>
    <span class="nav-icon">{icon}</span>
    {name}
    {#if badge}
        <span class="nav-badge">{badge}</span>
    {/if}
</a>

<style>
    .nav-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 24px;
        font-size: 13px;
        color: var(--sidebar-text);
        cursor: pointer;
        transition: all 0.15s;
        border-left: 2px solid transparent;
        text-decoration: none;
    }

    .nav-item:hover {
        background: rgba(255, 255, 255, 0.04);
        color: #fff;
    }

    .nav-item.active {
        color: var(--gold);
        border-left-color: var(--gold);
        background: rgba(201, 169, 97, 0.07);
        font-weight: 500;
    }

    .nav-icon {
        width: 15px;
        opacity: 0.7;
        font-size: 13px;
    }

    .nav-item.active .nav-icon {
        opacity: 1;
    }

    .nav-badge {
        margin-left: auto;
        background: var(--error);
        color: #fff;
        font-size: 9px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 10px;
        font-family: 'JetBrains Mono', monospace;
    }
</style>
