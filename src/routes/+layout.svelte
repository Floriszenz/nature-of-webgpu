<script>
    import { page } from "$app/stores";
    import "../app.css";
</script>

<svelte:head>
    <title>{$page.data.title ?? "The Nature of WebGPU"}</title>
</svelte:head>

<slot />
