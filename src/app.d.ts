/// <reference types="@webgpu/types" />

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
    namespace App {
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

        type WebGPUContext = {
            device: GPUDevice;
            context: GPUCanvasContext;
            presentationFormat: GPUTextureFormat;
        };

        // interface Error {}
        // interface Locals {}
        interface PageData {
            title: string;
            description: string;
            setup(ctx: WebGPUContext): SetupReturnType;
            update(ctx: WebGPUContext, setupData: SetupReturnType): void;
        }
        // interface Platform {}
    }
}

export {};
