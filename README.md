# nature-of-webgpu

[Nature of Code](https://natureofcode.com/) simulations implemented with [WebGPU](https://gpuweb.github.io/gpuweb/).

## Prerequisites

-   [Node.js](https://nodejs.org/) as runtime
-   [pnpm](https://pnpm.io/) as package manager
-   a browser that supports WebGPU (see [implementation status](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status))

## Developing

Once you've created a project and installed dependencies with `pnpm install`, start a development server:

```bash
pnpm dev

# or start the server and open the app in a new browser tab
pnpm dev -- --open
```

## Building

To create a production version of your app:

```bash
pnpm build
```

You can preview the production build with `pnpm preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
