<script lang="ts">
    import type { Component } from "svelte";

    type IconComponent = Component<{ size?: number | string; class?: string }>;
    type IconProps = {
        icon: IconComponent;
        size?: number | string;
        class?: string;
    };
    const { icon: Icon, size = 18 }: IconProps = $props();
</script>

<Icon {size} class="menu-icon" />

<style>
    /* :global(.menu-icon){
    } */
</style>
