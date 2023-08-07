import type { SimulationConfig } from "$lib/types";

export const title = "Arrive Behavior";

export const description =
    "This simulation shows how a steering force influences an autonomous agent to seek and arrive at a target, which is bound to the mouse position.";

const COMPUTE_SHADER = /*wgsl*/ `
    struct Particle {
        position: vec2f,
        velocity: vec2f
    }

    struct SimulationParams {
        target_pos: vec2f,
        arrival_radius: f32,
        max_speed: f32,
        max_force: f32
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

        var desired_velocity = params.target_pos - position;
        let dist = length(desired_velocity);

        if (dist <= params.arrival_radius) {
            // Arriving
            let desired_speed = (dist / params.arrival_radius) * params.max_speed;

            desired_velocity = desired_speed * normalize(desired_velocity);
        } else {
            // Seeking
            desired_velocity = params.max_speed * normalize(desired_velocity);
        }

        let steer_force = desired_velocity - velocity;
        let acceleration = limit(steer_force, params.max_force);

        // particles[index].velocity = limit(velocity + acceleration, params.max_speed);
        particles[index].position = position + velocity;
        particles[index].velocity = velocity + acceleration;
    }
`;

export const config: SimulationConfig = {
    type: "particle",
    options: {
        particleCount: 1,
        parameters: {
            targetPosition: [0.0, 0.0],
            arrivalRadius: 0.15,
            maxSpeed: 0.012,
            maxForce: 0.0005,
            _padding: 0,
        },
        targetProps: { radius: 0.15, resolution: 32 },
        boidProps: { width: 0.03, height: 0.06 },
    },
    simulationProgram: COMPUTE_SHADER,
    parametersOrder: ["targetPosition", "arrivalRadius", "maxSpeed", "maxForce", "_padding"],
};
