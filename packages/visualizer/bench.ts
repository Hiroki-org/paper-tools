import { buildCitationGraph } from "./src/graph.js";

async function run() {
    const start = performance.now();
    await buildCitationGraph("10.1145/3597503.3639187", 2, "both");
    const end = performance.now();
    console.log(`Time taken: ${end - start} ms`);
}

run().catch(console.error);
