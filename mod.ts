import { StatsDClient } from "./src/StatsDClient.ts";

const c = new StatsDClient();

let prev = Date.now();
setInterval(
  () => {
    const now = Date.now();
    c.adjustGauge("deno.gauge", Math.random() * 10 - 5, { sampling: 0.5 });
    prev = now;
  },
  200
);
