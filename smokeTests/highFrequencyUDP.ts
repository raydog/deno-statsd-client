import { StatsDClient } from "../mod.ts";

/*
 * Envirnoment: StatsD server, running in docker. Port 8125/udp.
 * 
 * `deno --unstable run --allow-net --allow-env highFrequencyUDP.ts`
 * 
 * Tests to make sure that the UDP buffer being flushed frequency doesn't lose data.
 */

const c = new StatsDClient();

main();

// Fire off a TON of count metrics, in a short period of time:
// Note: we occasionally yield to the macro-task queue, because otherwise the JS vm would run out of memory, since we'd
// generate chunks of memory to be flushed, but never actually give time to the network layer to do it.
async function main() {
  for (let i = 0; i < 10_000_000; i += 100) {
    // 100 at a time:
    for (let j = 0; j < 100; j++) {
      c.count("deno.lots o counts");
    }
    await waitZero();
  }
}

function waitZero(): Promise<void> {
  return new Promise((res) => setTimeout(res, 0));
}
