<script lang="ts">
    import { DrawContext } from "$lib/framework/draw-context.js";
    import { onMount } from "svelte";

    export let data;
    let canvas: HTMLCanvasElement;
    let width: number;
    let height: number;

    let simulation: { title: string };

    onMount(async () => {
        try {
            simulation = await import(`../../lib/simulations/${data.simulationId}.ts`);

            canvas.width = width;
            canvas.height = height;

            const ctx = await DrawContext.initialize(canvas);

            ctx.setupSimulation();
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
    :root {
        --gap: 32px;
    }

    main {
        display: grid;
        place-items: center;
        block-size: 100vb;
        inline-size: 100vi;
    }

    canvas {
        block-size: calc(100% - 2 * var(--gap));
        aspect-ratio: 1;
        border-radius: 20px;
        box-shadow: 0 0 15px hsla(0, 0%, 50%, 0.5);
    }
</style>
