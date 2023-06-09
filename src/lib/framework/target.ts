import * as utils from "./utils";

export class Target {
    #radius: number;
    #resolution: number;
    #vertexBuffer: GPUBuffer | undefined;
    #vertexCount: number | undefined;
    #renderPipeline: GPURenderPipeline | undefined;
    #simulationParamsBuffer: GPUBuffer | undefined;

    static #RENDER_SHADER = /*wgsl*/ `
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

    constructor(radius: number, resolution: number) {
        this.#radius = radius;
        this.#resolution = resolution;
    }

    initBuffer(device: GPUDevice) {
        const bufferData = utils.circle(this.#radius, this.#resolution);

        this.#vertexBuffer = utils.createBufferWithData(device, bufferData, GPUBufferUsage.VERTEX);
        this.#vertexCount = bufferData.length / 2;
    }

    initSimulationParametersBuffer(buffer: GPUBuffer) {
        this.#simulationParamsBuffer = buffer;
    }

    initRenderPipeline(device: GPUDevice, targetFormat: GPUTextureFormat) {
        const shaderModule = device.createShaderModule({ code: Target.#RENDER_SHADER });

        this.#renderPipeline = device.createRenderPipeline({
            label: "Target Render Pipeline",
            layout: "auto",
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
        if (!this.#simulationParamsBuffer)
            throw new Error(
                "Cannot show element without initializing the simulation parameter buffer."
            );

        passEncoder.setPipeline(this.#renderPipeline);
        passEncoder.setVertexBuffer(0, this.#simulationParamsBuffer, 0, 2 * 4);
        passEncoder.setVertexBuffer(1, this.#vertexBuffer);
        passEncoder.draw(this.#vertexCount);
    }
}
