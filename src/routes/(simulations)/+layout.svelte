<script lang="ts">
    import { page } from "$app/stores";

    let height: number;
    let width: number;
    let canvas: HTMLCanvasElement;
    let isSimulationRunning = false;

    function onPlayPauseClick() {
        if (isSimulationRunning) {
            // ctx.stopSimulation();
            isSimulationRunning = false;
        } else {
            // ctx.startSimulation();
            isSimulationRunning = true;
        }
    }
</script>

<main bind:clientHeight={height} bind:clientWidth={width}>
    <aside>
        <h1>{$page.data.title}</h1>
        <p>{$page.data.description}</p>
    </aside>
    <canvas bind:this={canvas} />
    <aside>
        <button on:click={onPlayPauseClick}>
            {#if isSimulationRunning}
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
