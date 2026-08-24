<script>
    import Sidebar from "../ui/sidebar/Sidebar.svelte";
    import "../app.css";

    let { children } = $props();
</script>

<div class="app-layout">
    <Sidebar />
    <main class="main">
        {@render children()}
    </main>
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
</style>

