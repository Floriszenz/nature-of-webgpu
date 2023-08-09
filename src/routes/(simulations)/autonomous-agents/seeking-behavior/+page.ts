import * as shapes from "$lib/framework/shapes";
import { createBufferWithData } from "$lib/framework";

const COMPUTE_SHADER = /*wgsl*/ `
    struct Particle {
        position: vec2f,
        velocity: vec2f
    }

    struct SimulationParams {
        target_pos: vec2f,
        max_speed: f32,
        max_force: f32,
    }

    @group(0) @binding(0) var<uniform> params: SimulationParams;
    @group(0) @binding(1) var<storage, read_write> particles: array<Particle>;

    fn limit(v: vec2f, max_length: f32) -> vec2f {
        return min(max_length, length(v)) * normalize(v);
    }

    @compute @workgroup_size(16)
    fn main(@builtin(global_invocation_id) giid: vec3u) {
        let index = giid.x;

        let position = &particles[index].position;
        let velocity = &particles[index].velocity;

        // Seek
        let desired_velocity = params.max_speed * normalize(params.target_pos - *position);
        let seek_force = desired_velocity - *velocity;
        var acceleration = vec2f(0.0);

        if (length(seek_force) != 0.0) {
            acceleration = limit(seek_force, params.max_force);
        }

        *velocity = limit(*velocity + acceleration, params.max_speed);
        *position = *position + *velocity;
    }
`;

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

const TARGET_POSITION = [0.0, 0.0];
const MAX_SPEED = 0.015;
const MAX_FORCE = 0.0005;

const PARTICLE_COUNT = 1;
const TARGET_RADIUS = 0.05;
const TARGET_RESOLUTION = 32;
const BOID_WIDTH = 0.03;
const BOID_HEIGHT = 0.06;

type ComputePipelineDefinition = {
    pipeline: GPUComputePipeline;
    bindGroups: GPUBindGroup[];
    workgroupCount: {
        x: number;
        y?: number;
        z?: number;
    };
};

type VertexBufferDefinition = {
    buffer: GPUBuffer;
    offset?: number;
    size?: number;
};

type RenderPipelineDefinition = {
    pipeline: GPURenderPipeline;
    vertexBuffers: VertexBufferDefinition[];
    drawCount: {
        vertexCount: number;
        instanceCount?: number;
    };
};

type SetupReturnType = {
    computePipelines: ComputePipelineDefinition[];
    renderPipelines: RenderPipelineDefinition[];
};

export const csr = true;
export const ssr = false;

export function load() {
    return {
        title: "Seeking Behavior",
        description:
            "This simulation shows how a steering force influences an autonomous agent to seek a target, which is bound to the mouse position.",

        setup(device: GPUDevice, presentationFormat: GPUTextureFormat): SetupReturnType {
            const simBGLayout = device.createBindGroupLayout({
                entries: [
                    { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
                    { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
                ],
            });

            const computePipeline = device.createComputePipeline({
                compute: {
                    entryPoint: "main",
                    module: device.createShaderModule({
                        code: COMPUTE_SHADER,
                    }),
                },
                layout: device.createPipelineLayout({ bindGroupLayouts: [simBGLayout] }),
            });

            const simParamsBuffer = createBufferWithData({
                device,
                label: "Simulation Parameters Buffer",
                data: new Float32Array([...TARGET_POSITION, MAX_SPEED, MAX_FORCE]),
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });

            const particleData = new Float32Array(4 * PARTICLE_COUNT);

            for (let idx = 0; idx < PARTICLE_COUNT; idx++) {
                // Position
                particleData[4 * idx + 0] = 2 * (Math.random() - 0.5);
                particleData[4 * idx + 1] = 2 * (Math.random() - 0.5);
                // Velocity
                particleData[4 * idx + 2] = 0;
                particleData[4 * idx + 3] = 0;
            }

            const particleBuffer = createBufferWithData({
                device,
                label: "Particle Buffer",
                data: particleData,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
            });

            const simBG = device.createBindGroup({
                layout: simBGLayout,
                entries: [
                    { binding: 0, resource: { buffer: simParamsBuffer } },
                    { binding: 1, resource: { buffer: particleBuffer } },
                ],
            });

            // Rendering - Target
            const targetBufferData = shapes.circle(TARGET_RADIUS, TARGET_RESOLUTION);

            const targetBuffer = createBufferWithData({
                device,
                label: "Target Vertex Buffer",
                data: targetBufferData,
                usage: GPUBufferUsage.VERTEX,
            });

            const targetShaderModule = device.createShaderModule({ code: TARGET_RENDER_SHADER });
            const targetPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [] });

            const targetRenderPipeline = device.createRenderPipeline({
                label: "Target Render Pipeline",
                layout: targetPipelineLayout,
                vertex: {
                    module: device.createShaderModule({ code: TARGET_RENDER_SHADER }),
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
                    module: targetShaderModule,
                    entryPoint: "frag_main",
                    targets: [{ format: presentationFormat }],
                },
                primitive: {
                    topology: "triangle-list",
                },
            });

            // Rendering - Boid
            const boidBufferData = shapes.triangle(BOID_WIDTH, BOID_HEIGHT);

            const boidBuffer = createBufferWithData({
                device,
                label: "Boid Vertex Buffer",
                data: boidBufferData,
                usage: GPUBufferUsage.VERTEX,
            });

            const boidShaderModule = device.createShaderModule({ code: BOID_RENDER_SHADER });
            const boidPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [] });

            const boidRenderPipeline = device.createRenderPipeline({
                label: "Boid Render Pipeline",
                layout: boidPipelineLayout,
                vertex: {
                    module: boidShaderModule,
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
                    module: boidShaderModule,
                    entryPoint: "frag_main",
                    targets: [{ format: presentationFormat }],
                },
                primitive: {
                    topology: "triangle-list",
                },
            });

            return {
                computePipelines: [
                    {
                        pipeline: computePipeline,
                        bindGroups: [simBG],
                        workgroupCount: {
                            x: Math.ceil(PARTICLE_COUNT / 16),
                        },
                    },
                ],
                renderPipelines: [
                    // Target
                    {
                        pipeline: targetRenderPipeline,
                        vertexBuffers: [
                            {
                                buffer: simParamsBuffer,
                                offset: 0,
                                size: 2 * Float32Array.BYTES_PER_ELEMENT,
                            },
                            {
                                buffer: targetBuffer,
                            },
                        ],
                        drawCount: { vertexCount: targetBufferData.length / 2 },
                    },
                    // Boid
                    {
                        pipeline: boidRenderPipeline,
                        vertexBuffers: [
                            {
                                buffer: particleBuffer,
                            },
                            {
                                buffer: boidBuffer,
                            },
                        ],
                        drawCount: {
                            vertexCount: boidBufferData.length / 2,
                            instanceCount: PARTICLE_COUNT,
                        },
                    },
                ],
            };
        },

        update(
            device: GPUDevice,
            ctx: GPUCanvasContext,
            setupData: SetupReturnType,
            simParamsData: Float32Array
        ) {
            device.queue.writeBuffer(
                setupData.renderPipelines[0].vertexBuffers[0].buffer,
                0,
                simParamsData
            );

            const commandEncoder = device.createCommandEncoder();

            {
                const passEncoder = commandEncoder.beginComputePass();

                for (const computePipeline of setupData.computePipelines) {
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

            {
                const passEncoder = commandEncoder.beginRenderPass({
                    colorAttachments: [
                        {
                            view: ctx.getCurrentTexture().createView(),
                            clearValue: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
                            loadOp: "clear",
                            storeOp: "store",
                        },
                    ],
                });

                for (const renderPipeline of setupData.renderPipelines) {
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

            device.queue.submit([commandEncoder.finish()]);
        },
    };
}
