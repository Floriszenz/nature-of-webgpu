import * as shapes from "../shapes";
import { createBufferWithData } from "../webgpu";
import type { Entity } from "./entity";

const TARGET_RENDER_SHADER = /*wgsl*/ `
    struct VertexOutput {
        @builtin(position) position: vec4f,
    }

    @vertex
    fn vert_main(
        @location(0) target_position: vec2f,
        @location(1) vertex_position: vec2f
    ) -> VertexOutput {
        var output: VertexOutput;

        output.position = vec4(vertex_position + target_position, 0.0, 1.0);

        return output;
    }

    @fragment
    fn frag_main() -> @location(0) vec4f {
        return vec4f(0.7, 0.7, 0.7, 1.0);
    }
`;

const DEFAULT_TARGET_RADIUS = 0.05;
const DEFAULT_TARGET_RESOLUTION = 32;

type Options = {
    radius?: number;
    resolution?: number;
};

export function createTarget({
    device,
    presentationFormat,
    radius,
    resolution,
}: Pick<App.WebGPUContext, "device" | "presentationFormat"> & Options): Entity {
    const vertexData = shapes.circle(
        radius ?? DEFAULT_TARGET_RADIUS,
        resolution ?? DEFAULT_TARGET_RESOLUTION
    );

    const vertexBuffer = createBufferWithData({
        device,
        label: "Target Vertex Buffer",
        data: vertexData,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const shaderModule = device.createShaderModule({ code: TARGET_RENDER_SHADER });
    const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [] });

    const renderingPipeline = device.createRenderPipeline({
        label: "Target Render Pipeline",
        layout: pipelineLayout,
        vertex: {
            module: shaderModule,
            entryPoint: "vert_main",
            buffers: [
                {
                    arrayStride: 2 * 4,
                    stepMode: "instance",
                    attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
                },
                {
                    arrayStride: 2 * 4,
                    stepMode: "vertex",
                    attributes: [{ shaderLocation: 1, offset: 0, format: "float32x2" }],
                },
            ],
        },
        fragment: {
            module: shaderModule,
            entryPoint: "frag_main",
            targets: [{ format: presentationFormat }],
        },
        primitive: {
            topology: "triangle-list",
        },
    });

    return { renderingPipeline, vertexBuffer, vertexCount: vertexData.length / 2 };
}
