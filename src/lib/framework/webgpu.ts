export async function initializeWebGPU(canvas: HTMLCanvasElement): Promise<App.WebGPUContext> {
    const adapter = await navigator.gpu.requestAdapter();

    if (!adapter) throw new Error("Failed to initialize GPU adapter.");

    const context = canvas.getContext("webgpu");

    if (!context) throw new Error("Failed to initialize WebGPU drawing context.");

    const device = await adapter.requestDevice();
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({ device, format: presentationFormat });

    return { device, context, presentationFormat };
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

export function encodeComputePass(
    commandEncoder: GPUCommandEncoder,
    pipelines: App.ComputePipelineDefinition[]
) {
    const passEncoder = commandEncoder.beginComputePass();

    for (const computePipeline of pipelines) {
        passEncoder.setPipeline(computePipeline.pipeline);

        computePipeline.bindGroups.forEach((bindGroup, idx) => {
            passEncoder.setBindGroup(idx, bindGroup);
        });

        passEncoder.dispatchWorkgroups(
            computePipeline.workgroupCount.x,
            computePipeline.workgroupCount.y,
            computePipeline.workgroupCount.z
        );
    }

    passEncoder.end();
}

export function encodeRenderPass(
    context: GPUCanvasContext,
    commandEncoder: GPUCommandEncoder,
    pipelines: App.RenderPipelineDefinition[]
) {
    const passEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [
            {
                view: context.getCurrentTexture().createView(),
                clearValue: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
                loadOp: "clear",
                storeOp: "store",
            },
        ],
    });

    for (const renderPipeline of pipelines) {
        passEncoder.setPipeline(renderPipeline.pipeline);

        renderPipeline.vertexBuffers.forEach((vertexBuffer, idx) => {
            passEncoder.setVertexBuffer(
                idx,
                vertexBuffer.buffer,
                vertexBuffer.offset,
                vertexBuffer.size
            );
        });

        passEncoder.draw(
            renderPipeline.drawCount.vertexCount,
            renderPipeline.drawCount.instanceCount
        );
    }

    passEncoder.end();
}
