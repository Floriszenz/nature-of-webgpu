import type { SimulationConfig } from "$lib/types";
import { ParticleSimulation } from "./particle-simulation";

export class DrawContext {
    #ctx!: GPUCanvasContext;
    #device!: GPUDevice;
    #presentationFormat!: GPUTextureFormat;
    #simulation: ParticleSimulation<string> | undefined;
    #animationHandle: number | undefined;
    #shouldUpdateParams: boolean = false;

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

    setupSimulation(config: SimulationConfig) {
        this.#simulation = new ParticleSimulation(config.options);

        this.#simulation.setupSimulation(
            this.#device,
            config.simulationProgram,
            config.parametersOrder
        );
        this.#simulation.setupRendering(this.#device, this.#presentationFormat);

        const { left, top, width, height } = (
            this.#ctx.canvas as HTMLCanvasElement
        ).getBoundingClientRect();

        (this.#ctx.canvas as HTMLCanvasElement).addEventListener("mousemove", (event) => {
            const x = 2 * ((event.x - left) / width - 0.5);
            const y = -2 * ((event.y - top) / height - 0.5);

            this.#simulation!.setParameter("targetPosition", [x, y]);
            this.#shouldUpdateParams = true;
        });
    }

    update(commandEncoder: GPUCommandEncoder) {
        const passEncoder = commandEncoder.beginComputePass();

        this.#simulation!.update(passEncoder);
        passEncoder.end();
    }

    show(commandEncoder: GPUCommandEncoder) {
        const passEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.#ctx.getCurrentTexture().createView(),
                    clearValue: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
                    loadOp: "clear",
                    storeOp: "store",
                },
            ],
        });

        this.#simulation!.show(passEncoder);
        passEncoder.end();
    }

    run() {
        if (!this.#simulation) throw new Error("Cannot run without a simulation");

        if (this.#shouldUpdateParams) {
            this.#simulation.updateParametersBuffer(this.#device);
            this.#shouldUpdateParams = false;
        }

        const commandEncoder = this.#device.createCommandEncoder();

        this.update(commandEncoder);
        this.show(commandEncoder);
        this.#device.queue.submit([commandEncoder.finish()]);

        this.#animationHandle = requestAnimationFrame(() => this.run());
    }

    startSimulation() {
        this.#animationHandle = requestAnimationFrame(() => this.run());
    }

    stopSimulation() {
        if (this.#animationHandle) {
            cancelAnimationFrame(this.#animationHandle);
            this.#animationHandle = undefined;
        }
    }
}
