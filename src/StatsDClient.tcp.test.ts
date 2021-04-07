import { asserts, BufReader } from "../testDeps.ts";
import { StatsDClient } from "./StatsDClient.ts";
import { StatsDError } from "./StatsDError.ts";

Deno.test("StatsDClient (TCP) can send basic counts", async () => {
  const server = new TCPServer();
  const client = new StatsDClient({
    server: { proto: "tcp", port: server.port },
    maxDelayMs: 10,
  });
  
  client.count("foo.bar");

  await server.check("foo.bar:1|c\n");
  
  await client.close();
  server.close();
});

Deno.test("StatsDClient (TCP) can send basic timers", async () => {
  const server = new TCPServer();
  const client = new StatsDClient({
    server: { proto: "tcp", port: server.port },
    maxDelayMs: 10,
  });

  client.timing("test.timing", 22);

  await server.check("test.timing:22|ms\n");
  
  await client.close();
  server.close();
});

Deno.test("StatsDClient (TCP) can send basic gauges", async () => {
  const server = new TCPServer();
  const client = new StatsDClient({
    server: { proto: "tcp", port: server.port },
    maxDelayMs: 10,
  });

  client.gauge("test.gauge", 1);

  await server.check("test.gauge:1|g\n");
  
  await client.close();
  server.close();
});

Deno.test("StatsDClient (TCP) can send basic gauge adjustments", async () => {
  const server = new TCPServer();
  const client = new StatsDClient({
    server: { proto: "tcp", port: server.port },
    maxDelayMs: 10,
  });

  client.adjustGauge("test.gauge", -42);

  await server.check("test.gauge:-42|g\n");
  
  await client.close();
  server.close();
});

Deno.test("StatsDClient (TCP) can send basic set metrics", async () => {
  const server = new TCPServer();
  const client = new StatsDClient({
    server: { proto: "tcp", port: server.port },
    maxDelayMs: 10,
  });

  client.unique("test.distinct-users", "55fe6ee9-6f4e-4805-9685-6b42f73ac9ed");

  await server.check("test.distinct-users:55fe6ee9-6f4e-4805-9685-6b42f73ac9ed|s\n");
  
  await client.close();
  server.close();
});

Deno.test("StatsDClient (TCP) can batch multiple metrics", async () => {
  const server = new TCPServer();
  const client = new StatsDClient({
    server: { proto: "tcp", port: server.port },
    maxDelayMs: 10,
  });

  client.count("http.requests", 1);
  client.timing("http.response-time", 22);

  await server.check("http.requests:1|c\n");
  await server.check("http.response-time:22|ms\n");
  
  await client.close();
  server.close();
});

Deno.test("StatsDClient (TCP) can have sample rates", async () => {
  const server = new TCPServer();
  const client = new StatsDClient({
    server: { proto: "tcp", port: server.port },
    maxDelayMs: 10,
  });

  // Guarantee that the next Math.random roll will be 0.001:
  // Aside: Deno's test runner REALLY needs some setup and cleanup methods...
  const mathRandom = Math.random;
  Math.random = () => 0.001;
  client.count("http.requests", 1, { sampleRate: 0.5 });
  Math.random = mathRandom; // Restore.

  await server.check("http.requests:1|c|@0.5\n");
  
  await client.close();
  server.close();
});

Deno.test("StatsDClient (TCP) can have global tags", async () => {
  const server = new TCPServer();
  const client = new StatsDClient({
    server: { proto: "tcp", port: server.port },
    maxDelayMs: 10,
    globalTags: { host: "talking-whiz-kid-plus" },
  });

  client.count("http.requests", 1);

  await server.check("http.requests:1|c|#host:talking-whiz-kid-plus\n");
  
  await client.close();
  server.close();
});

Deno.test("StatsDClient (TCP) can have metric tags", async () => {
  const server = new TCPServer();
  const client = new StatsDClient({
    server: { proto: "tcp", port: server.port },
    maxDelayMs: 10,
  });

  client.count("http.requests", 1, { tags: { mood: "meh" } });

  await server.check("http.requests:1|c|#mood:meh\n");
  
  await client.close();
  server.close();
});

Deno.test("StatsDClient (TCP) can merge global and metric tags", async () => {
  const server = new TCPServer();
  const client = new StatsDClient({
    server: { proto: "tcp", port: server.port },
    maxDelayMs: 10,
    globalTags: { region: "us-east-1" },
  });

  client.count("http.requests", 1, { tags: { "tier": "pro" } });

  await server.check("http.requests:1|c|#region:us-east-1,tier:pro\n");
  
  await client.close();
  server.close();
});

Deno.test("StatsDClient (TCP) close will flush backlog", async () => {
  const server = new TCPServer();
  const client = new StatsDClient({
    server: { proto: "tcp", port: server.port },
  });

  client.count("http.closing_flush", 1);
  await client.close();

  await server.check("http.closing_flush:1|c\n");

  server.close();
});

Deno.test("StatsDClient (TCP) double-close will error", async () => {
  const server = new TCPServer();
  const client = new StatsDClient({
    server: { proto: "tcp", port: server.port }
  });
  await client.close();
  await server.close();
  await asserts.assertThrowsAsync(() => client.close(), StatsDError);
});

// Simple TCP server for verification:

class TCPServer {
  readonly port: number;
  #server: Deno.Listener;
  #conn: Deno.Conn | null = null;
  #bufRead: BufReader | null = null;
  
  constructor() {
    this.#server = Deno.listen({
      transport: "tcp",
      hostname: "localhost",
      port: 0,
    })
    if (this.#server.addr.transport !== "tcp") throw new Error("Bad transport");
    this.port = this.#server.addr.port;
  }

  async getLineReader(): Promise<BufReader> {
    if (this.#bufRead) { return this.#bufRead; }
    this.#conn = await this.#server.accept();
    return (this.#bufRead = new BufReader(this.#conn));
  }

  async check(correct: string): Promise<void> {
    const reader = await this.getLineReader();
    const line = await reader.readString("\n");
    asserts.assertEquals(line, correct);
  }

  close() {
    this.#server.close();
    this.#conn?.close();
  }
}
