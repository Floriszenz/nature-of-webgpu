<script lang="ts">
    import { simParams } from "./stores";
</script>

<div>
    <label for="arrivalRadius">Arrival Radius</label>
    <input
        id="arrivalRadius"
        type="range"
        bind:value={$simParams.arrivalRadius}
        max="0.5"
        min="0.01"
        step="0.01" />
    <span>{$simParams.arrivalRadius}</span>
</div>
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
