import { writable } from "svelte/store";

export const simParams = writable({
    maxSpeed: 0.025,
    maxForce: 0.001,
});
