import * as shapes from "../shapes";
import { createBufferWithData } from "../webgpu";
import type { Entity } from "./entity";

const BOID_RENDER_SHADER = /*wgsl*/ `
    const HALF_PI = 0.5 * 3.14159;

    struct VertexOutput {
        @builtin(position) position: vec4f,
    }

    @vertex
    fn vert_main(
        @location(0) boid_position: vec2f,
        @location(1) boid_velocity: vec2f,
        @location(2) vertex_position: vec2f
    ) -> VertexOutput {
        var angle = -HALF_PI;

        if (length(boid_velocity) > 0.0) {
            angle += atan2(boid_velocity.y, boid_velocity.x);
        }

        let position = vec2(
            (vertex_position.x * cos(angle)) - (vertex_position.y * sin(angle)),
            (vertex_position.x * sin(angle)) + (vertex_position.y * cos(angle))
        );
        var output: VertexOutput;

        output.position = vec4(position + boid_position, 0.0, 1.0);

        return output;
    }

    @fragment
    fn frag_main() -> @location(0) vec4f {
        return vec4f(0.4, 0.23, 0.72, 1.0);
    }
`;

const DEFAULT_BOID_WIDTH = 0.03;
const DEFAULT_BOID_HEIGHT = 0.06;

type Options = {
    width?: number;
    height?: number;
};

export function createBoid({
    device,
    presentationFormat,
    width,
    height,
}: Pick<App.WebGPUContext, "device" | "presentationFormat"> & Options): Entity {
    const vertexData = shapes.triangle(width ?? DEFAULT_BOID_WIDTH, height ?? DEFAULT_BOID_HEIGHT);

    const vertexBuffer = createBufferWithData({
        device,
        label: "Boid Vertex Buffer",
        data: vertexData,
        usage: GPUBufferUsage.VERTEX,
    });

    const shaderModule = device.createShaderModule({ code: BOID_RENDER_SHADER });
    const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [] });

    const renderingPipeline = device.createRenderPipeline({
        label: "Boid Render Pipeline",
        layout: pipelineLayout,
        vertex: {
            module: shaderModule,
            entryPoint: "vert_main",
            buffers: [
                {
                    arrayStride: 4 * 4,
                    stepMode: "instance",
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: "float32x2" },
                        { shaderLocation: 1, offset: 2 * 4, format: "float32x2" },
                    ],
                },
                {
                    arrayStride: 2 * 4,
                    stepMode: "vertex",
                    attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }],
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
