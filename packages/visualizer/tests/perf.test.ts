import { describe, it } from "vitest";
import { buildCitationGraph } from "../src/graph.js";

describe("Performance test", () => {
    it("should build citation graph fast", async () => {
        // We override fetch to simulate the delay of API calls.
        global.fetch = async (url: string) => {
            await new Promise(r => setTimeout(r, 10)); // 10ms delay

            if (url.includes('citations')) {
                return {
                    ok: true,
                    status: 200,
                    json: async () => [
                        { citing: `cite_${Math.random()}`, cited: `seed_${Math.random()}` },
                        { citing: `cite_${Math.random()}`, cited: `seed_${Math.random()}` },
                    ]
                } as any;
            }
            return {
                ok: true,
                status: 200,
                json: async () => [
                    { citing: `seed_${Math.random()}`, cited: `ref_${Math.random()}` },
                    { citing: `seed_${Math.random()}`, cited: `ref_${Math.random()}` },
                ]
            } as any;
        };

        const start = Date.now();
        // Depth 3 means:
        // d=0: 1 node => 2 API calls
        // d=1: 4 nodes => 8 API calls
        // d=2: 16 nodes => 32 API calls
        // Total = 42 API calls
        //
        // In original sequence: 42 * 10ms = 420ms minimum wait just for API calls,
        // but wait, getting citations & refs for each node is sequential:
        // 1 * (10+10) + 4 * (10+10) + 16 * (10+10) = 20 + 80 + 320 = 420ms
        // Wait, fetchWithRetry has delay logic, rate limiter has 1000ms delay for 5 requests!
        const graph = await buildCitationGraph("seed", 3, "both");
        const end = Date.now();
        console.log(`Execution time: ${end - start}ms`);
        console.log(`Nodes: ${graph.nodes.length}`);
    }, 60000); // 60s timeout
});
