/// <reference lib="webworker" />

let wasmReady = false;
let greet: () => string;
let generateMap: (params: any) => any;

async function initialize() {
  // Dynamic import with a variable so esbuild doesn't resolve it at build time
  const wasmGluePath = '/wasm/map_generator_wasm.js';
  const wasm = await import(wasmGluePath);
  await wasm.default();
  greet = wasm.greet;
  generateMap = wasm.generateMap;
  wasmReady = true;
}

addEventListener('message', async ({ data }) => {
  if (data.type === 'generate') {
    if (!wasmReady) await initialize();

    const result = greet();
    const mapData = generateMap({ subdivisionLevel: 3 });

    postMessage({ type: 'map-ready', result, mapData });
  }
});
