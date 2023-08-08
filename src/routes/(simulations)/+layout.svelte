<script lang="ts">
    import { page } from "$app/stores";
    import { initializeContext } from "$lib/framework";
    import { onMount } from "svelte";

    let height: number;
    let width: number;
    let canvas: HTMLCanvasElement;
    let isSimulationRunning = false;
    let animationHandle: number;

    $: canvasRect = canvas?.getBoundingClientRect();

    let device: GPUDevice;
    let ctx: GPUCanvasContext;
    let format: GPUTextureFormat;
    let setupData: App.SetupReturnType;
    let mousePosition: { x: number; y: number } = { x: 0, y: 0 };

    onMount(async () => {
        canvas.width = Math.min(width, height);
        canvas.height = Math.min(width, height);

        [device, ctx, format] = await initializeContext(canvas);

        setupData = $page.data.setup(device, format);

        runSimulation();
        isSimulationRunning = true;
    });

    function runSimulation() {
        $page.data.update(device, ctx, setupData, mousePosition);

        animationHandle = requestAnimationFrame(() => runSimulation());
    }

    function handleMouseMove(event: MouseEvent) {
        if (isSimulationRunning) {
            mousePosition.x = 2 * ((event.x - canvasRect.left) / width - 0.5);
            mousePosition.y = -2 * ((event.y - canvasRect.top) / height - 0.5);
        }
    }

    function onPlayPauseClick() {
        if (isSimulationRunning) {
            cancelAnimationFrame(animationHandle);
            isSimulationRunning = false;
        } else {
            runSimulation();
            isSimulationRunning = true;
        }
    }
</script>

<main>
    <aside>
        <h1>{$page.data.title}</h1>
        <p>{$page.data.description}</p>
    </aside>
    <canvas
        bind:this={canvas}
        bind:clientHeight={height}
        bind:clientWidth={width}
        on:mousemove={handleMouseMove} />
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

<slot />

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
