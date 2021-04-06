import { asserts } from "../../testDeps.ts";
import { describeAddr } from "./describeAddr.ts";

Deno.test("describeAddr works for UDP", () => {
  const addr: Deno.Addr = { transport: "udp", hostname: "localhost", port: 1234 };
  asserts.assertEquals(describeAddr(addr), "localhost:1234 (udp)");
});

Deno.test("describeAddr works for TCP", () => {
  const addr: Deno.Addr = { transport: "tcp", hostname: "localhost", port: 1234 };
  asserts.assertEquals(describeAddr(addr), "localhost:1234 (tcp)");
});

Deno.test("describeAddr works for unix sockets", () => {
  const addr: Deno.Addr = { transport: "unix", path: "/run/server/blah.sock" };
  asserts.assertEquals(describeAddr(addr), "/run/server/blah.sock (unix)");
});
