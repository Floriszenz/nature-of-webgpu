export function circle(radius: number, edgePointCount: number): Float32Array {
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

export function triangle(base: number, height: number): Float32Array {
    return new Float32Array([-(base / 2), -(height / 2), base / 2, -(height / 2), 0.0, height / 2]);
}

export function createBufferWithData(
    device: GPUDevice,
    data: Float32Array,
    usage: GPUBufferUsageFlags
): GPUBuffer {
    const buffer = device.createBuffer({
        size: data.byteLength,
        usage,
        mappedAtCreation: true,
    });

    new Float32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();

    return buffer;
}
