import { writable } from "svelte/store";

export const simParams = writable({
    arrivalRadius: 0.15,
    maxSpeed: 0.025,
    maxForce: 0.001,
});
