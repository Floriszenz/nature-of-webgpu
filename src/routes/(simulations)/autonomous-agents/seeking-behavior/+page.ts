import { createBoid } from "$lib/framework/entities/boid";
import { createTarget } from "$lib/framework/entities/target";
import { createBufferWithData, encodeComputePass, encodeRenderPass } from "$lib/framework/webgpu";
import { mousePosition } from "$lib/stores";

import { simParams } from "./stores";

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

const PARTICLE_COUNT = 1;

export const csr = true;
export const ssr = false;

export function load(): App.PageData {
    const simParamsData = new Float32Array(4);

    return {
        title: "Seeking Behavior",
        description:
            "This simulation shows how a steering force influences an autonomous agent to seek a target, which is bound to the mouse position.",

        setup({ device, presentationFormat }) {
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
                data: simParamsData,
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

            const target = createTarget({ device, presentationFormat });
            const boid = createBoid({ device, presentationFormat });

            mousePosition.subscribe(({ x, y }) => {
                simParamsData[0] = x;
                simParamsData[1] = y;

                device.queue.writeBuffer(simParamsBuffer, 0, simParamsData);
            });

            simParams.subscribe(({ maxForce, maxSpeed }) => {
                simParamsData[2] = maxSpeed;
                simParamsData[3] = maxForce;

                device.queue.writeBuffer(simParamsBuffer, 0, simParamsData);
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
                        pipeline: target.renderingPipeline,
                        vertexBuffers: [
                            {
                                buffer: simParamsBuffer,
                                offset: 0,
                                size: 2 * Float32Array.BYTES_PER_ELEMENT,
                            },
                            { buffer: target.vertexBuffer },
                        ],
                        drawCount: { vertexCount: target.vertexCount },
                    },
                    // Boid
                    {
                        pipeline: boid.renderingPipeline,
                        vertexBuffers: [{ buffer: particleBuffer }, { buffer: boid.vertexBuffer }],
                        drawCount: {
                            vertexCount: boid.vertexCount,
                            instanceCount: PARTICLE_COUNT,
                        },
                    },
                ],
            };
        },

        update({ device, context }, { computePipelines, renderPipelines }) {
            const commandEncoder = device.createCommandEncoder();

            encodeComputePass(commandEncoder, computePipelines);
            encodeRenderPass(context, commandEncoder, renderPipelines);

            device.queue.submit([commandEncoder.finish()]);
        },
    };
}
