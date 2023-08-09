<script lang="ts">
    import { onMount } from "svelte";

    import { simParams } from "$lib/stores";

    onMount(() => {
        $simParams = {
            maxSpeed: 0.025,
            maxForce: 0.001,
        };
    });
</script>

<div>
    <label for="maxSpeed">Maximum Speed</label>
    <input
        id="maxSpeed"
        type="range"
        bind:value={$simParams.maxSpeed}
        max="0.2"
        min="0.005"
        step="0.005" />
    <span>{$simParams.maxSpeed}</span>
</div>
<div>
    <label for="maxForce">Maximum Force</label>
    <input
        id="maxForce"
        type="range"
        bind:value={$simParams.maxForce}
        max="0.02"
        min="0.0005"
        step="0.0005" />
    <span>{$simParams.maxForce}</span>
</div>
