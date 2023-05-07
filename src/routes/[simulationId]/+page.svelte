<script lang="ts">
    import { onMount } from "svelte";

    export let data;
    let canvas: HTMLCanvasElement;
    let width: number;
    let height: number;

    let simulation: { title: string };

    onMount(async () => {
        try {
            simulation = await import(`../../lib/simulations/${data.simulationId}.ts`);
        } catch (error) {
            // TODO: Show 404 page
            console.log(error);
        }
    });
</script>

<svelte:head>
    {#if simulation}
        <title>{simulation.title}</title>
    {/if}
</svelte:head>

<main bind:clientHeight={height} bind:clientWidth={width}>
    <canvas bind:this={canvas} />
</main>

<style>
    main {
        display: grid;
        place-items: center;
        block-size: 100vb;
        inline-size: 100vi;
    }

    canvas {
        block-size: 100%;
        inline-size: 100%;
    }
</style>
