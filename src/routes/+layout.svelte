<script>
    import Sidebar from "$lib/ui/sidebar/Sidebar.svelte";
    import MobileTabBar from "$lib/ui/sidebar/MobileTabBar.svelte";
    import "../app.css";

    let { children } = $props();
</script>

<div class="app-layout">
    <Sidebar />
    <main class="main">
        {@render children()}
    </main>
    <MobileTabBar />
</div>

<style>
    .app-layout {
        display: flex;
        height: 100vh;
        overflow: hidden;
    }

    .main {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 0;
    }

    /* !important is needed here: Sidebar.svelte's own scoped `.sidebar {
       display: flex }` rule compiles to a two-class selector
       (.sidebar.s-xxxxx), which outranks this layout's unscoped
       :global(.sidebar) on specificity regardless of source order. */
    @media (max-width: 767px) {
        :global(.sidebar) {
            display: none !important;
        }
    }
</style>

