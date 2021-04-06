import { StatsDClient } from "../mod.ts";
import { log } from "../deps.ts";

/*
 * Envirnoment: StatsD server, running in docker. Port 8125 tcp or udp.
 * 
 * `deno --unstable run --allow-net --allow-env highFrequency.ts`
 * 
 * Tests to make sure that the UDP buffer being flushed frequency doesn't lose data. Or that TCP can keep up.
 */

await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler("DEBUG"),
  },
  loggers: {
    statsd: {
      level: "DEBUG",
      handlers: ["console"]
    }
  }
});

const c = new StatsDClient({
  server: {
    proto: "tcp",
  }
});

main();

// Fire off a TON of count metrics, in a short period of time:
// Note: we occasionally yield to the macro-task queue, because otherwise the JS vm would run out of memory, since we'd
// generate chunks of memory to be flushed, but never actually give time to the network layer to do it.
async function main() {
  for (let i = 0; i < 10_000_000; i += 500) {
    // 100 at a time:
    for (let j = 0; j < 500; j++) {
      c.count("deno.lots o counts");
    }
    await waitZero();
  }
}

function waitZero(): Promise<void> {
  return new Promise((res) => setTimeout(res, 0));
}
