<script lang="ts">
    import { onMount } from "svelte";

    import { page } from "$app/stores";
    import { initializeWebGPU } from "$lib/framework/webgpu";
    import { mousePosition } from "$lib/stores";

    let height: number;
    let width: number;
    let canvas: HTMLCanvasElement;
    let isSimulationRunning = false;
    let animationHandle: number;

    $: canvasRect = canvas?.getBoundingClientRect();

    let ctx: App.WebGPUContext;
    let setupData: App.SetupReturnType;

    onMount(async () => {
        canvas.width = Math.min(width, height);
        canvas.height = Math.min(width, height);

        ctx = await initializeWebGPU(canvas);

        setupData = $page.data.setup(ctx);

        runSimulation();
        isSimulationRunning = true;
    });

    function runSimulation() {
        $page.data.update(ctx, setupData);

        animationHandle = requestAnimationFrame(() => runSimulation());
    }

    function handleMouseMove(event: MouseEvent) {
        if (isSimulationRunning) {
            $mousePosition.x = 2 * ((event.x - canvasRect.left) / width - 0.5);
            $mousePosition.y = -2 * ((event.y - canvasRect.top) / height - 0.5);
        }
    }

    function toggleSimulation() {
        if (isSimulationRunning) {
            cancelAnimationFrame(animationHandle);
            isSimulationRunning = false;
        } else {
            runSimulation();
            isSimulationRunning = true;
        }
    }

    function handleKeyUp(event: KeyboardEvent) {
        switch (event.key) {
            case "k":
                toggleSimulation();
                break;
        }
    }
</script>

<svelte:window on:keyup={handleKeyUp} />

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
        <button on:click={toggleSimulation}>
            {#if isSimulationRunning}
                Pause simulation
            {:else}
                Resume simulation
            {/if}
        </button>

        <div>
            <slot />
        </div>
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
