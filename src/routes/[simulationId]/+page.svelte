<script lang="ts">
    import { DrawContext } from "$lib/framework/draw-context.js";
    import type { SimulationDescription } from "$lib/types.js";
    import { onMount } from "svelte";

    export let data;
    let canvas: HTMLCanvasElement;
    let width: number;
    let height: number;

    let ctx: DrawContext;
    let simulation: Promise<SimulationDescription> = new Promise(() => {});
    let isRunning: boolean = false;

    onMount(async () => {
        try {
            simulation = import(`../../lib/simulations/${data.simulationId}.ts`);

            canvas.width = width;
            canvas.height = height;

            ctx = await DrawContext.initialize(canvas);

            ctx.setupSimulation((await simulation).config);
            ctx.startSimulation();
            isRunning = true;
        } catch (error) {
            // TODO: Show 404 page
            console.log(error);
        }
    });

    function onPlayPauseClick() {
        if (isRunning) {
            ctx.stopSimulation();
            isRunning = false;
        } else {
            ctx.startSimulation();
            isRunning = true;
        }
    }
</script>

<svelte:head>
    {#await simulation then simulation}
        <title>{simulation.title}</title>
    {/await}
</svelte:head>

<main bind:clientHeight={height} bind:clientWidth={width}>
    <aside>
        {#await simulation}
            <p>Loading...</p>
        {:then simulation}
            <h1>{simulation?.title}</h1>
            <p>{simulation?.description}</p>
        {/await}
    </aside>
    <canvas bind:this={canvas} />
    <aside>
        <button on:click={onPlayPauseClick}>
            {#if isRunning}
                Pause simulation
            {:else}
                Resume simulation
            {/if}
        </button>
    </aside>
</main>

<style>
    :root {
        --gap: 32px;
    }

    main {
        display: grid;
        grid-template-columns: 1fr 2fr 1fr;
        gap: var(--gap);
        place-items: start center;
        padding: var(--gap);
    }

    canvas {
        block-size: calc(100vmin - 2 * var(--gap));
        aspect-ratio: 1;
        border-radius: 20px;
        box-shadow: 0 0 15px hsla(0, 0%, 50%, 0.5);
    }

    @media screen and (orientation: portrait) {
        main {
            grid-template-columns: auto;
            grid-template-rows: auto 1fr auto;
        }
    }
</style>
