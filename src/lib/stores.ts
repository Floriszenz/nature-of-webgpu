import { writable } from "svelte/store";

export const mousePosition = writable({ x: 0, y: 0 });
