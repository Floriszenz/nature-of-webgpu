import type { Options } from "./framework/particle-simulation";

export interface SimulationConfig {
    type: "particle";
    options: Options<string>;
    simulationProgram: string;
    parametersOrder: string[];
}

export interface SimulationDescription {
    title: string;
    description: string;
    config: SimulationConfig;
}
