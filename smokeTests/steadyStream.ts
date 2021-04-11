import { StatsDClient } from "../mod.ts";
import { log } from "../deps.ts";

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
});

let prev = Date.now();

setInterval(sendOne, 100);

function sendOne() {
  const now = Date.now();

  const id = Math.floor(Math.random() * 16 * 16).toString(16).padStart(2, "0")
    .repeat(12);

  c.unique("deno.sets.blah", id, { tags: { "𝖀𝖓𝖎𝖈𝖔𝖉𝖊": "hello" } });
  // c.event({
  //   title: "500 Server Error",
  //   text: new Error("blah is not defined").stack || "",
  //   aggregate: "Errors",
  //   source: "Dunno",
  //   type: "info",
  //   tags: { production: true, region: "us_west_2" },
  // });
  prev = now;
}
