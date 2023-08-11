import { createBoid, createTarget } from "$lib/framework/entities";
import { circle } from "$lib/framework/shapes";
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
        arrival_radius: f32,
        max_speed: f32,
        max_force: f32,
    }

    @group(0) @binding(0) var<uniform> params: SimulationParams;
    @group(0) @binding(1) var<storage, read_write> particles: array<Particle>;

    fn limit(v: vec2f, max_length: f32) -> vec2f {
        if (length(v) == 0.0) {
            return vec2f(0.0);
        }

        return min(max_length, length(v)) * normalize(v);
    }

    @compute @workgroup_size(16)
    fn main(@builtin(global_invocation_id) giid: vec3u) {
        let index = giid.x;

        let position = &particles[index].position;
        let velocity = &particles[index].velocity;

        var desired_velocity = params.target_pos - *position;
        let particle_distance = length(desired_velocity);

        if (particle_distance <= params.arrival_radius) {
            // Arrive
            if (particle_distance > 0.0) {
                let desired_speed = (particle_distance / params.arrival_radius) * params.max_speed;

                desired_velocity = desired_speed * normalize(desired_velocity);
            }
        } else {
            // Seek
            desired_velocity = params.max_speed * normalize(desired_velocity);
        }

        let steer_force = desired_velocity - *velocity;
        let acceleration = limit(steer_force, params.max_force);

        *velocity = limit(*velocity + acceleration, params.max_speed);
        *position = *position + *velocity;
    }
`;

export const csr = true;
export const ssr = false;

export function load({ url }): App.PageData {
    const simParamsData = new Float32Array(8);
    const particlesCount = parseInt(url.searchParams.get("particles") ?? "1");

    return {
        title: "Arriving Behavior",
        description:
            "This simulation shows how a steering force influences an autonomous agent to seek and arrive at a target, which is bound to the mouse position.",

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

            const particleData = new Float32Array(4 * particlesCount);

            for (let idx = 0; idx < particlesCount; idx++) {
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

            const target = createTarget({ device, presentationFormat, radius: 0.15 });
            const boid = createBoid({ device, presentationFormat });

            mousePosition.subscribe(({ x, y }) => {
                simParamsData[0] = x;
                simParamsData[1] = y;

                device.queue.writeBuffer(simParamsBuffer, 0, simParamsData);
            });

            simParams.subscribe(({ arrivalRadius, maxForce, maxSpeed }) => {
                simParamsData[2] = arrivalRadius;
                simParamsData[3] = maxSpeed;
                simParamsData[4] = maxForce;

                device.queue.writeBuffer(simParamsBuffer, 0, simParamsData);
                device.queue.writeBuffer(target.vertexBuffer, 0, circle(arrivalRadius, 32));
            });

            return {
                computePipelines: [
                    {
                        pipeline: computePipeline,
                        bindGroups: [simBG],
                        workgroupCount: {
                            x: Math.ceil(particlesCount / 16),
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
                            instanceCount: particlesCount,
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
