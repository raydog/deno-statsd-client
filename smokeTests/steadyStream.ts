import { StatsDClient } from "../mod.ts";

/*
 * Envirnoment: StatsD server, running in docker. Port 8125, tcp or udp.
 * 
 * `deno --unstable run --allow-net --allow-env steadyStream.ts`
 * 
 * Writes a slow, steady stream of events, to test outages.
 */

const c = new StatsDClient({
  server: {
    proto: "tcp"
  }
});

let prev = Date.now();

setInterval(sendOne, 500);

function sendOne() {
  const now = Date.now();
  c.timing("deno.steady-stream", now - prev);
  prev = now;
}
