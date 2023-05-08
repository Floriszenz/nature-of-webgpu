import * as utils from "./utils";

export class BoidSwarm {
    #width: number;
    #height: number;
    #vertexBuffer: GPUBuffer | undefined;
    #vertexCount: number | undefined;
    #renderPipeline: GPURenderPipeline | undefined;
    #instanceBuffer: GPUBuffer | undefined;
    #instanceCount: number | undefined;

    static #RENDER_SHADER = /*wgsl*/ `
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
            let angle = atan2(boid_velocity.y, boid_velocity.x) - HALF_PI;
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

    constructor(width: number, height: number) {
        this.#width = width;
        this.#height = height;
    }

    initBuffer(device: GPUDevice) {
        const bufferData = utils.triangle(this.#width, this.#height);

        this.#vertexBuffer = utils.createBufferWithData(device, bufferData, GPUBufferUsage.VERTEX);
        this.#vertexCount = bufferData.length / 2;
    }

    initInstanceBuffer(buffer: GPUBuffer, instanceCount: number) {
        this.#instanceBuffer = buffer;
        this.#instanceCount = instanceCount;
    }

    initRenderPipeline(device: GPUDevice, targetFormat: GPUTextureFormat) {
        const shaderModule = device.createShaderModule({ code: BoidSwarm.#RENDER_SHADER });

        this.#renderPipeline = device.createRenderPipeline({
            label: "Boid Render Pipeline",
            layout: "auto",
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
                targets: [{ format: targetFormat }],
            },
            primitive: {
                topology: "triangle-list",
            },
        });
    }

    show(passEncoder: GPURenderPassEncoder) {
        if (!this.#vertexBuffer || !this.#vertexCount)
            throw new Error("Cannot show element without initializing the vertex buffer.");
        if (!this.#renderPipeline)
            throw new Error("Cannot show element without initializing the render pipeline.");
        if (!this.#instanceBuffer)
            throw new Error("Cannot show element without initializing the instance buffer.");

        passEncoder.setPipeline(this.#renderPipeline);
        passEncoder.setVertexBuffer(0, this.#instanceBuffer);
        passEncoder.setVertexBuffer(1, this.#vertexBuffer);
        passEncoder.draw(this.#vertexCount, this.#instanceCount);
    }
}
