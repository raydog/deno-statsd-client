import { StatsDClient } from "../mod.ts";
import { log } from "../testDeps.ts";

/*
 * Envirnoment: StatsD server, running in docker.
 *
 * `deno --unstable run --allow-net --allow-env steadyStream.ts`
 *
 * Writes a slow, steady stream of events, to test outages.
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
    proto: "udp",
  },
  dialect: "datadog",
  logger: log.getLogger("statsd"),
});

setInterval(sendOne, 1000);

function sendOne() {
  const id = Math.floor(Math.random() * 16 * 16).toString(16).padStart(2, "0")
    .repeat(12);

  c.unique("deno.sets.blah", id, { tags: { "𝖀𝖓𝖎𝖈𝖔𝖉𝖊": "hello" } });
}
