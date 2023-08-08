export async function initializeContext(canvas: HTMLCanvasElement) {
    const adapter = await navigator.gpu.requestAdapter();

    if (!adapter) throw new Error("Failed to initialize GPU adapter.");

    const ctx = canvas.getContext("webgpu");

    if (!ctx) throw new Error("Failed to initialize WebGPU drawing context.");

    const device = await adapter.requestDevice();
    const format = navigator.gpu.getPreferredCanvasFormat();

    ctx.configure({ device, format });

    return [device, ctx, format] as const;
}
