<script>
    import { getTheme, setTheme } from '$lib/theme';
    let activeTab = 'general';

    const settings = {
        storeName: 'Golden Studio',
        currency: 'PKR',
        language: 'English',
        notifications: true
    };
    let theme = $state(getTheme());
    /** @type {[import('$lib/theme').Theme, string][]} */
    const themes = [['light', 'Light'], ['dark', 'Dark'], ['system', 'System']];
</script>

<div class="topbar">
    <div class="breadcrumb"><span>Settings</span></div>
</div>

<div class="content-area">
    <div class="scroll-area">
        <div class="page-header">
            <div>
                <div class="page-title">Settings</div>
                <div class="page-meta">Manage your store preferences and system configuration</div>
            </div>
            <button class="btn-gold">Save Changes</button>
        </div>

        <div class="tab-row">
            <div class="tab" class:active={activeTab === 'general'} onclick={() => activeTab = 'general'}>General</div>
            <div class="tab" class:active={activeTab === 'users'} onclick={() => activeTab = 'users'}>Users & Roles</div>
            <div class="tab" class:active={activeTab === 'billing'} onclick={() => activeTab = 'billing'}>Billing</div>
            <div class="tab" class:active={activeTab === 'security'} onclick={() => activeTab = 'security'}>Security</div>
        </div>

        <div class="settings-grid">
            <div class="settings-card">
                <div class="card-header">Store Configuration</div>
                <div class="form-group">
                    <label>Store Name</label>
                    <input type="text" bind:value={settings.storeName} class="settings-input">
                </div>
                <div class="form-group">
                    <label>Currency</label>
                    <select bind:value={settings.currency} class="settings-select">
                        <option value="PKR">PKR - Pakistani Rupee</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="GBP">GBP - British Pound</option>
                    </select>
                </div>
            </div>

            <div class="settings-card">
                <div class="card-header">Preferences</div>
                <div class="form-group toggle-group">
                    <div>
                        <div class="label">Email Notifications</div>
                        <div class="sub-label">Receive daily summary of orders and payments</div>
                    </div>
                    <input type="checkbox" bind:checked={settings.notifications}>
                </div>
                <div class="form-group toggle-group">
                    <div>
                        <div class="label">Appearance</div>
                        <div class="sub-label">Light, dark, or follow your device</div>
                    </div>
                    <div class="segmented" role="radiogroup" aria-label="Appearance">
                        {#each themes as [value, label] (value)}
                            <button
                                type="button"
                                role="radio"
                                aria-checked={theme === value}
                                class:on={theme === value}
                                onclick={() => { theme = value; setTheme(value); }}
                            >{label}</button>
                        {/each}
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .segmented { display: inline-flex; padding: 3px; gap: 2px; border-radius: 10px; background: var(--bg2); border: 1px solid var(--border); }
    .segmented button { border: 0; background: transparent; color: var(--text-muted); font: inherit; font-size: 13px; font-weight: 500; padding: 6px 14px; border-radius: 7px; cursor: pointer; }
    .segmented button.on { background: var(--white); color: var(--text); box-shadow: var(--shadow); }
    .segmented button:focus-visible { outline: 2px solid var(--gold); outline-offset: 1px; }
    .topbar {
        background: var(--bg);
        border-bottom: 1px solid var(--border);
        padding: 0 28px;
        height: 56px;
        display: flex;
        align-items: center;
        flex-shrink: 0;
    }

    .breadcrumb {
        font-size: 12px;
        color: var(--text-muted);
    }

    .breadcrumb span {
        color: var(--text);
        font-weight: 500;
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

    .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 22px;
    }

    .page-title {
        font-family: 'Playfair Display', serif;
        font-size: 34px;
        font-weight: 500;
        letter-spacing: -0.01em;
        line-height: 1;
    }

    .page-meta {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 6px;
    }

    .btn-gold {
        display: flex;
        align-items: center;
        gap: 6px;
        background: var(--gold);
        border: none;
        border-radius: 8px;
        padding: 7px 14px;
        font-size: 12px;
        font-weight: 500;
        color: #fff;
        cursor: pointer;
        font-family: 'DM Sans', sans-serif;
        box-shadow: 0 2px 8px rgba(201, 169, 97, 0.3);
        transition: all 0.15s;
    }

    .btn-gold:hover {
        background: #b8953a;
    }

    .tab-row {
        display: flex;
        border-bottom: 1px solid var(--border);
        margin-bottom: 20px;
    }

    .tab {
        padding: 9px 18px 11px;
        font-size: 13px;
        font-weight: 400;
        color: var(--text-muted);
        cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
        transition: all 0.15s;
    }

    .tab:hover {
        color: var(--text);
    }

    .tab.active {
        color: var(--text);
        font-weight: 500;
        border-bottom-color: var(--gold);
    }

    .settings-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }

    .settings-card {
        background: var(--white);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 20px;
        box-shadow: var(--shadow);
    }

    .card-header {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text-faint);
        margin-bottom: 18px;
    }

    .form-group {
        margin-bottom: 16px;
    }

    .form-group label {
        display: block;
        font-size: 12px;
        font-weight: 500;
        color: var(--text-muted);
        margin-bottom: 6px;
    }

    .settings-input, .settings-select {
        width: 100%;
        padding: 8px 12px;
        background: var(--bg2);
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 13px;
        font-family: 'DM Sans', sans-serif;
        color: var(--text);
        outline: none;
        transition: all 0.15s;
    }

    .settings-input:focus, .settings-select:focus {
        border-color: var(--gold);
        background: var(--white);
    }

    .toggle-group {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid var(--border-light);
    }

    .toggle-group:last-child {
        border-bottom: none;
    }

    .toggle-group .label {
        font-size: 13px;
        font-weight: 500;
        color: var(--text);
    }

    .toggle-group .sub-label {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 2px;
    }
</style>
