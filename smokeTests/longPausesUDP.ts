import { StatsDClient } from "../mod.ts";

/*
 * Envirnoment: StatsD server, running in docker. Port 8125/udp.
 * 
 * `deno --unstable run --allow-net --allow-env longPausesUDP.ts`
 * 
 * Tests to make sure that long pauses between sending still arrive at the server.
 */

const c = new StatsDClient();

let prev = Date.now();

setTimeout(sendOne, 2000);

function sendOne() {
  const now = Date.now();
  c.timing("deno.long delays.lol", now - prev);
  prev = now;
  const mins = Math.floor(Math.random() * 9 + 1);
  console.log("Waiting %d min...", mins);
  setTimeout(sendOne, mins * 60 * 1000);
}
