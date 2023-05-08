export class Target {
    static renderShader() {
        return /*wgsl*/ `
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
    }
}
