import { asserts } from "../testDeps.ts";
import { StatsDClient } from "./StatsDClient.ts";
import { StatsDError } from "./StatsDError.ts";

Deno.test("StatsDClient can initialize with default params", async () => {
  const client = new StatsDClient();
  await client.close();
});

Deno.test("StatsDClient can send basic counts", async () => {
  const [server,port] = _udpServer();
  const client = new StatsDClient({ server: { proto: "udp", port }, maxDelayMs: 10 });

  client.count('foo.bar');
  const mesg = await _readMessage(server);
  asserts.assertEquals(mesg, "foo.bar:1|c");

  await client.close();
  server.close();
});

Deno.test("StatsDClient can send basic timers", async () => {
  const [server,port] = _udpServer();
  const client = new StatsDClient({ server: { proto: "udp", port }, maxDelayMs: 10});

  client.timing('test.timing', 22);
  const mesg = await _readMessage(server);
  asserts.assertEquals(mesg, "test.timing:22|ms");

  await client.close();
  server.close();
});

Deno.test("StatsDClient can send basic gauges", async () => {
  const [server,port] = _udpServer();
  const client = new StatsDClient({ server: { proto: "udp", port }, maxDelayMs: 10});

  client.gauge('test.gauge', 1);
  const mesg = await _readMessage(server);
  asserts.assertEquals(mesg, "test.gauge:1|g");

  await client.close();
  server.close();
});

Deno.test("StatsDClient can send basic gauge adjustments", async () => {
  const [server,port] = _udpServer();
  const client = new StatsDClient({ server: { proto: "udp", port }, maxDelayMs: 10});

  client.adjustGauge('test.gauge', -42);
  const mesg = await _readMessage(server);
  asserts.assertEquals(mesg, "test.gauge:-42|g");

  await client.close();
  server.close();
});

Deno.test("StatsDClient can send basic set metrics", async () => {
  const [server,port] = _udpServer();
  const client = new StatsDClient({ server: { proto: "udp", port }, maxDelayMs: 10});

  client.unique('test.distinct-users', '55fe6ee9-6f4e-4805-9685-6b42f73ac9ed');
  const mesg = await _readMessage(server);
  asserts.assertEquals(mesg, "test.distinct-users:55fe6ee9-6f4e-4805-9685-6b42f73ac9ed|s");

  await client.close();
  server.close();
});

Deno.test("StatsDClient can batch multiple metrics", async () => {
  const [server,port] = _udpServer();
  const client = new StatsDClient({ server: { proto: "udp", port }, maxDelayMs: 10});

  client.count('http.requests', 1);
  client.timing('http.response-time', 22);

  const mesg = await _readMessage(server);
  asserts.assertEquals(mesg, "http.requests:1|c\nhttp.response-time:22|ms");

  await client.close();
  server.close();
});

Deno.test("StatsDClient can flush early when buffer exceeds the MTU", async () => {
  const [server,port] = _udpServer();
  const client = new StatsDClient({ server: { proto: "udp", port, mtu: 25 }, maxDelayMs: 10});

  const mesgPromise = _readMessage(server);
  client.count('http.requests', 1);
  client.timing('http.response-time', 22);

  const mesg1 = await mesgPromise;
  asserts.assertEquals(mesg1, "http.requests:1|c");

  const mesg2 = await _readMessage(server);
  asserts.assertEquals(mesg2, "http.response-time:22|ms");

  await client.close();
  server.close();
});

Deno.test("StatsDClient can error when a metric exceeds the MTU", async () => {
  const [server,port] = _udpServer();
  const client = new StatsDClient({ server: { proto: "udp", port, mtu: 25 }, maxDelayMs: 10});

  asserts.assertThrows(
    () => client.timing('http.server-83478382932.us-east-1.other-details-really-long.response-time', 22),
    StatsDError,
    "too large"
  );

  await client.close();
  server.close();
});

Deno.test("StatsDClient can have sample rates", async () => {
  const [server,port] = _udpServer();
  const client = new StatsDClient({ server: { proto: "udp", port }, maxDelayMs: 10});

  // Guarantee that the next Math.random roll will be 0.001:
  // Aside: Deno's test runner REALLY needs some setup and cleanup methods...
  const mathRandom = Math.random;
  Math.random = () => 0.001;
  client.count('http.requests', 1, { sampleRate: 0.5 });
  Math.random = mathRandom; // Restore.

  const mesg = await _readMessage(server);
  asserts.assertEquals(mesg, "http.requests:1|c|@0.5");

  await client.close();
  server.close();
});

Deno.test("StatsDClient can have global tags", async () => {
  const [server,port] = _udpServer();
  const client = new StatsDClient({ server: { proto: "udp", port }, maxDelayMs: 10, globalTags: { host: "talking-whiz-kid-plus"}});

  client.count('http.requests', 1);
  
  const mesg = await _readMessage(server);
  asserts.assertEquals(mesg, "http.requests:1|c|#host:talking-whiz-kid-plus");

  await client.close();
  server.close();
});

Deno.test("StatsDClient can have metric tags", async () => {
  const [server,port] = _udpServer();
  const client = new StatsDClient({ server: { proto: "udp", port }, maxDelayMs: 10 });

  client.count('http.requests', 1, { tags: { mood: "meh" } });
  
  const mesg = await _readMessage(server);
  asserts.assertEquals(mesg, "http.requests:1|c|#mood:meh");

  await client.close();
  server.close();
});

Deno.test("StatsDClient can merge global and metric tags", async () => {
  const [server,port] = _udpServer();
  const client = new StatsDClient({ server: { proto: "udp", port }, maxDelayMs: 10, globalTags: { region: "us-east-1" } });

  client.count('http.requests', 1, { tags: { "tier": "pro" } });
  
  const mesg = await _readMessage(server);
  asserts.assertEquals(mesg, "http.requests:1|c|#region:us-east-1,tier:pro");

  await client.close();
  server.close();
});

Deno.test("StatsDClient double-close will error", async () => {
  const client = new StatsDClient();
  await client.close();
  await asserts.assertThrowsAsync(() => client.close(), StatsDError);
});

function _udpServer(): [server: Deno.DatagramConn, port: number] {
  const server = Deno.listenDatagram({ transport: "udp", hostname: "127.0.0.1", port: 0 });
  if (server.addr.transport !== "udp") { throw new Error("Bad transport"); }
  return [ server, server.addr.port ];
}

async function _readMessage(server: Deno.DatagramConn): Promise<string> {
  const [buf] = await server.receive();
  return new TextDecoder().decode(buf);
}
