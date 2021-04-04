import { StatsDClient } from "./src/StatsDClient.ts";

const c = new StatsDClient();

let prev = Date.now();
setInterval(
  () => {
    const now = Date.now();
    c.timing("deno.timing", now - prev, { sampling: 0.5 });
    prev = now;
  },
  200
);
