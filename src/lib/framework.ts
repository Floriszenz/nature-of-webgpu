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

export function createBufferWithData({
    device,
    data,
    usage,
    label,
}: {
    device: GPUDevice;
    data: Float32Array;
    usage: GPUBufferUsageFlags;
    label?: string;
}): GPUBuffer {
    const buffer = device.createBuffer({
        label,
        size: data.byteLength,
        usage,
        mappedAtCreation: true,
    });

    new Float32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();

    return buffer;
}
