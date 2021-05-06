import { StatsDClient } from "../mod.ts";
import { log } from "../testDeps.ts";

/*
 * Envirnoment: StatsD server, running in docker.
 * 
 * `deno --unstable run --allow-net --allow-env longPauses.ts`
 * 
 * Tests to make sure that long pauses between sending still arrive at the server.
 */

await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler("DEBUG"),
  },
  loggers: {
    statsd: {
      level: "DEBUG",
      handlers: ["console"],
    },
  },
});

const c = new StatsDClient({
  server: {
    proto: "tcp",
  },
});

let prev = Date.now();

setTimeout(sendOne, 2000);

function sendOne() {
  const now = Date.now();
  c.timing("deno.long delays.lol", now - prev);
  prev = now;
  const mins = Math.floor(Math.random() * 20 + 1);
  console.log("Waiting %d min...", mins);
  setTimeout(sendOne, mins * 60 * 1000);
}
