<script>
    import Menu from "./Menu.svelte";
    import { MENU_CONFIG } from "./menu.config";
</script>

<aside class="sidebar">
    <div class="sidebar-brand">
        <div class="brand-name">Golden Studio</div>
        <div class="brand-sub">Production Suite</div>
    </div>

    <div class="sidebar-content">
        {#each MENU_CONFIG as section}
            <Menu {...section} />
        {/each}
    </div>

    <div class="sidebar-bottom">
        <div class="user-card">
            <div class="user-avatar">U</div>
            <div class="user-info">
                <div class="user-name">Uzain</div>
                <div class="user-role">An Extra</div>
            </div>
        </div>
    </div>
</aside>

<style>
    .sidebar {
        width: 230px;
        min-width: 230px;
        background: var(--sidebar-bg);
        display: flex;
        flex-direction: column;
        height: 100vh;
        flex-shrink: 0;
        color: var(--sidebar-text);
    }

    .sidebar-brand {
        padding: 28px 24px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .brand-name {
        font-family: 'Playfair Display', serif;
        font-size: 17px;
        font-weight: 600;
        color: #fff;
    }

    .brand-sub {
        font-size: 10px;
        color: var(--gold);
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin-top: 3px;
        font-weight: 500;
    }

    .sidebar-content {
        flex: 1;
        overflow-y: auto;
    }

    .sidebar-bottom {
        margin-top: auto;
        padding: 16px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .user-card {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .user-avatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: var(--gold-mid);
        border: 1px solid var(--gold);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 600;
        color: var(--gold);
    }

    .user-info {
        display: flex;
        flex-direction: column;
    }

    .user-name {
        font-size: 12px;
        color: #fff;
        font-weight: 500;
    }

    .user-role {
        font-size: 10px;
        color: var(--sidebar-text);
    }
</style>
