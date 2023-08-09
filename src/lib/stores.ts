import { writable } from "svelte/store";

export const simParams = writable<Record<string, any>>({});
