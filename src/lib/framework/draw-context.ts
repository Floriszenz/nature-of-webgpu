import { Boid } from "./boid";
import { Target } from "./target";

export class DrawContext {
    #ctx!: GPUCanvasContext;
    #device!: GPUDevice;
    #presentationFormat!: GPUTextureFormat;

    static async initialize(canvas: HTMLCanvasElement): Promise<DrawContext> {
        let instance = new DrawContext();
        let adapter = await navigator.gpu.requestAdapter();

        instance.#device = await adapter!.requestDevice();
        instance.#ctx = canvas.getContext("webgpu")!;
        instance.#presentationFormat = navigator.gpu.getPreferredCanvasFormat();

        instance.#ctx.configure({
            device: instance.#device,
            format: instance.#presentationFormat,
        });

        return instance;
    }

    static circle(radius: number, edgePointCount: number): Float32Array {
        const center = [0, 0];
        const edgePoints: [number, number][] = [];

        for (let i = 0; i < edgePointCount; i++) {
            const angle = (2 * Math.PI * i) / edgePointCount;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);

            edgePoints.push([x, y]);
        }

        const vertices: number[] = [];

        for (let i = 0; i < edgePointCount; i++) {
            const currentPoint = edgePoints.at(i)!;
            const previousPoint = edgePoints.at(i - 1)!;

            vertices.push(...center, ...currentPoint, ...previousPoint);
        }

        return new Float32Array(vertices);
    }

    setupSimulation() {
        const boidShaderModule = this.#device.createShaderModule({ code: Boid.renderShader() });
        const renderPipeline = this.#device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: boidShaderModule,
                entryPoint: "vert_main",
                buffers: [
                    {
                        arrayStride: 4 * 4,
                        stepMode: "instance",
                        attributes: [
                            { shaderLocation: 0, offset: 0, format: "float32x2" },
                            { shaderLocation: 1, offset: 8, format: "float32x2" },
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
                targets: [{ format: this.#presentationFormat }],
            },
            primitive: {
                topology: "triangle-list",
            },
        });
        const targetSM = this.#device.createShaderModule({ code: Target.renderShader() });
        const targetPipeline = this.#device.createRenderPipeline({
            label: "Target Pipeline",
            layout: "auto",
            vertex: {
                module: targetSM,
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
                module: targetSM,
                entryPoint: "frag_main",
                targets: [{ format: this.#presentationFormat }],
            },
            primitive: {
                topology: "triangle-list",
            },
        });
        const computePipeline = this.#device.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.#device.createShaderModule({ code: Boid.computeShader() }),
                entryPoint: "main",
            },
        });
        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    view: undefined as any,
                    clearValue: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
                    loadOp: "clear",
                    storeOp: "store",
                },
            ],
        };

        const vertexBufferData = new Float32Array([-0.015, -0.03, 0.015, -0.03, 0.0, 0.03]);
        const boidVertexBuffer = this.#device.createBuffer({
            size: vertexBufferData.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        });
        new Float32Array(boidVertexBuffer.getMappedRange()).set(vertexBufferData);
        boidVertexBuffer.unmap();

        const targetBufferData = DrawContext.circle(0.05, 32);
        const targetVertexBuffer = this.#device.createBuffer({
            size: targetBufferData.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        });
        new Float32Array(targetVertexBuffer.getMappedRange()).set(targetBufferData);
        targetVertexBuffer.unmap();

        const simParams = {
            targetPosition: [0.0, 0.0],
            maxSpeed: 0.015,
            maxForce: 0.0005,
        };
        const simParamsBufferSize = 4 * Float32Array.BYTES_PER_ELEMENT;
        const simParamsBuffer = this.#device.createBuffer({
            size: simParamsBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
        });

        const updateSimParams = () => {
            this.#device.queue.writeBuffer(
                simParamsBuffer,
                0,
                new Float32Array([
                    ...simParams.targetPosition,
                    simParams.maxSpeed,
                    simParams.maxForce,
                ])
            );
        };

        updateSimParams();

        const numParticles = 1;
        const initialParticleData = new Float32Array(numParticles * 4);

        for (let i = 0; i < numParticles; i++) {
            initialParticleData[4 * i + 0] = 2 * (Math.random() - 0.5);
            initialParticleData[4 * i + 1] = 2 * (Math.random() - 0.5);
            initialParticleData[4 * i + 2] = 0;
            initialParticleData[4 * i + 3] = 0;
        }

        const particleBuffer = this.#device.createBuffer({
            size: initialParticleData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
            mappedAtCreation: true,
        });
        new Float32Array(particleBuffer.getMappedRange()).set(initialParticleData);
        particleBuffer.unmap();
        const particleBindGroup = this.#device.createBindGroup({
            layout: computePipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: simParamsBuffer,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: particleBuffer,
                        offset: 0,
                        size: initialParticleData.byteLength,
                    },
                },
            ],
        });

        const { left, top, width, height } = (
            this.#ctx.canvas as HTMLCanvasElement
        ).getBoundingClientRect();
        let areParamsUpdated = false;

        (this.#ctx.canvas as HTMLCanvasElement).addEventListener("mousemove", (event) => {
            const x = 2 * ((event.x - left) / width - 0.5);
            const y = -2 * ((event.y - top) / height - 0.5);

            simParams.targetPosition = [x, y];
            areParamsUpdated = true;
        });

        const frame = () => {
            // @ts-ignore
            renderPassDescriptor.colorAttachments[0].view = this.#ctx
                .getCurrentTexture()
                .createView();

            if (areParamsUpdated) {
                updateSimParams();
                areParamsUpdated = false;
            }

            const commandEncoder = this.#device.createCommandEncoder();

            {
                const passEncoder = commandEncoder.beginComputePass();
                passEncoder.setPipeline(computePipeline);
                passEncoder.setBindGroup(0, particleBindGroup);
                passEncoder.dispatchWorkgroups(Math.ceil(numParticles / 16));
                passEncoder.end();
            }
            {
                const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
                // Target
                passEncoder.setPipeline(targetPipeline);
                passEncoder.setVertexBuffer(0, simParamsBuffer, 0, 2 * 4);
                passEncoder.setVertexBuffer(1, targetVertexBuffer);
                passEncoder.draw(targetBufferData.length / 2);
                // Boid
                passEncoder.setPipeline(renderPipeline);
                passEncoder.setVertexBuffer(0, particleBuffer);
                passEncoder.setVertexBuffer(1, boidVertexBuffer);
                passEncoder.draw(3, numParticles, 0, 0);
                passEncoder.end();
            }

            this.#device.queue.submit([commandEncoder.finish()]);
            requestAnimationFrame(frame);
        };

        requestAnimationFrame(frame);
    }

    update() {}

    show() {}
}
