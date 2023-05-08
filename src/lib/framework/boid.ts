export class Boid {
    static computeShader() {
        return /*wgsl*/ `
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

                let position = particles[index].position;
                let velocity = particles[index].velocity;

                // Seek
                let desired_velocity = params.max_speed * normalize(params.target_pos - position);
                let seek_force = desired_velocity - velocity;
                let acceleration = limit(seek_force, params.max_force);

                particles[index].velocity = limit(velocity + acceleration, params.max_speed);
                particles[index].position = position + velocity;
            }
        `;
    }

    static renderShader() {
        return /*wgsl*/ `
            const HALF_PI = 0.5 * 3.14159;

            struct VertexOutput {
                @builtin(position) position: vec4f,
            }

            @vertex
            fn vert_main(
                @location(0) boid_position: vec2f,
                @location(1) boid_velocity: vec2f,
                @location(2) pos: vec2f
            ) -> VertexOutput {
                let angle = atan2(boid_velocity.y, boid_velocity.x) - HALF_PI;
                let position = vec2(
                    (pos.x * cos(angle)) - (pos.y * sin(angle)),
                    (pos.x * sin(angle)) + (pos.y * cos(angle))
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
    }
}
