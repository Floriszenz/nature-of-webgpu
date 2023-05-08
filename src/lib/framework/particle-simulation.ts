import { BoidSwarm } from "./boid-swarm";
import { Target } from "./target";
import * as utils from "./utils";

export type Options<P extends string> = {
    particleCount: number;
    parameters: Record<P, number | [number, number]>;
    targetProps: {
        radius: number;
        resolution: number;
    };
    boidProps: {
        width: number;
        height: number;
    };
};

export class ParticleSimulation<P extends string> {
    #target: Target;
    #boidSwarm: BoidSwarm;

    #particleCount: number;
    #particleBuffer: GPUBuffer | undefined;
    #particleBindGroup: GPUBindGroup | undefined;
    #parameters: Options<P>["parameters"];
    #parametersOrder: P[] | undefined;
    #parametersBuffer: GPUBuffer | undefined;
    #computePipeline: GPUComputePipeline | undefined;

    constructor({ particleCount, parameters, boidProps, targetProps }: Options<P>) {
        this.#particleCount = particleCount;
        this.#parameters = parameters;
        this.#target = new Target(targetProps.radius, targetProps.resolution);
        this.#boidSwarm = new BoidSwarm(boidProps.width, boidProps.height);
    }

    setupSimulation(device: GPUDevice, shader: string, parametersOrder: P[]) {
        this.initComputePipeline(device, shader);

        this.#parametersOrder = parametersOrder;

        this.initParametersBuffer(device);
        this.updateParametersBuffer(device);
        this.#target.initSimulationParametersBuffer(this.#parametersBuffer!);

        this.initParticleBuffer(device);
        this.#boidSwarm.initInstanceBuffer(this.#particleBuffer!, this.#particleCount);
    }

    setupRendering(device: GPUDevice, targetFormat: GPUTextureFormat) {
        this.#target.initRenderPipeline(device, targetFormat);
        this.#target.initBuffer(device);

        this.#boidSwarm.initRenderPipeline(device, targetFormat);
        this.#boidSwarm.initBuffer(device);
    }

    initParametersBuffer(device: GPUDevice): GPUBuffer {
        const parametersCount = Object.values(this.#parameters)
            .map((p) => (p instanceof Array ? p.length : 1))
            .reduce((sum, val) => (sum += val), 0);

        this.#parametersBuffer = device.createBuffer({
            size: parametersCount * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        return this.#parametersBuffer;
    }

    setParameter(key: P, value: number | [number, number]) {
        this.#parameters[key] = value;
    }

    updateParametersBuffer(device: GPUDevice) {
        if (!this.#parametersOrder || !this.#parametersBuffer)
            throw new Error("Cannot update parameters buffer without initializing it.");

        const parameterValues = this.#parametersOrder.flatMap((p) => this.#parameters[p]);

        device.queue.writeBuffer(this.#parametersBuffer, 0, new Float32Array(parameterValues));
    }

    initParticleBuffer(device: GPUDevice): GPUBuffer {
        if (!this.#computePipeline)
            throw new Error("Cannot use compute pipeline without initializing it.");
        if (!this.#parametersBuffer)
            throw new Error("Cannot use parameters buffer without initializing it.");
        const initialParticleData = new Float32Array(4 * this.#particleCount);

        for (let i = 0; i < this.#particleCount; i++) {
            // Position
            initialParticleData[4 * i + 0] = 2 * (Math.random() - 0.5);
            initialParticleData[4 * i + 1] = 2 * (Math.random() - 0.5);
            // Velocity
            initialParticleData[4 * i + 2] = 0;
            initialParticleData[4 * i + 3] = 0;
        }

        this.#particleBuffer = utils.createBufferWithData(
            device,
            initialParticleData,
            GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
        );

        this.#particleBindGroup = device.createBindGroup({
            layout: this.#computePipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.#parametersBuffer,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.#particleBuffer,
                        offset: 0,
                        size: initialParticleData.byteLength,
                    },
                },
            ],
        });

        return this.#particleBuffer;
    }

    initComputePipeline(device: GPUDevice, shader: string) {
        const shaderModule = device.createShaderModule({ code: shader });

        this.#computePipeline = device.createComputePipeline({
            label: "Simulation Compute Pipeline",
            layout: "auto",
            compute: {
                module: shaderModule,
                entryPoint: "main",
            },
        });
    }

    update(passEncoder: GPUComputePassEncoder) {
        if (!this.#computePipeline)
            throw new Error("Cannot step without initializing the compute pipeline.");
        if (!this.#particleBindGroup)
            throw new Error("Cannot step without initializing the particles buffer.");

        passEncoder.setPipeline(this.#computePipeline);
        passEncoder.setBindGroup(0, this.#particleBindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(this.#particleCount / 16));
    }

    show(passEncoder: GPURenderPassEncoder) {
        this.#target.show(passEncoder);
        this.#boidSwarm.show(passEncoder);
    }
}
