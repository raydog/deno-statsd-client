import { asserts } from "../../testDeps.ts";
import { StatsDError } from "../StatsDError.ts";
import { StatsDDialect } from "./StatsDDialect.ts";

Deno.test("StatsDDialect.assertValidMetricKey (non-UDP) accepts ok keys", () => {
  const d = new StatsDDialect(false);
  d.assertValidMetricKey("a");
  d.assertValidMetricKey("http.server.time");
  d.assertValidMetricKey("deno.this is a metric.foobar");
  d.assertValidMetricKey(
    "lol.<script>this is still ok</script>.I_dunno",
  );
});

Deno.test("StatsDDialect.assertValidMetricKey (UDP) accepts ok keys", () => {
  const d = new StatsDDialect(true);
  d.assertValidMetricKey("a");
  d.assertValidMetricKey("http.server.time");
  d.assertValidMetricKey(
    "statsd.might.mangle.TǶÏŠ.but.its.not.actually.broken",
  );
  d.assertValidMetricKey(
    "lol.<script>this is still ok</script>.I_dunno",
  );
});

Deno.test("StatsDDialect.assertValidMetricKey (non-UDP) rejects bad keys", () => {
  const d = new StatsDDialect(false);
  asserts.assertThrows(
    () => d.assertValidMetricKey(""),
    StatsDError,
    "Key is required",
  );
  asserts.assertThrows(
    () => d.assertValidMetricKey("a:b"),
    StatsDError,
    "Key cannot include",
  );
  asserts.assertThrows(
    () => d.assertValidMetricKey("lol|phooie"),
    StatsDError,
    "Key cannot include",
  );
  asserts.assertThrows(
    () => d.assertValidMetricKey("don't send newlines >> \n"),
    StatsDError,
    "Key cannot include",
  );
  asserts.assertThrows(
    () => d.assertValidMetricKey("hashes # mess # with # tags"),
    StatsDError,
    "Key cannot include",
  );
  asserts.assertThrows(
    () => d.assertValidMetricKey("these ; mess ; with ; normalized ; tags"),
    StatsDError,
    "Key cannot include",
  );
  asserts.assertThrows(
    () => d.assertValidMetricKey("sockets.dont.like.TǶÏŠ"),
    StatsDError,
    "ASCII",
  );
});

Deno.test("StatsDDialect.assertValidMetricKey (UDP) rejects bad keys", () => {
  const d = new StatsDDialect(true);
  asserts.assertThrows(
    () => d.assertValidMetricKey(""),
    StatsDError,
    "Key is required",
  );
  asserts.assertThrows(
    () => d.assertValidMetricKey("a:b"),
    StatsDError,
    "Key cannot include",
  );
  asserts.assertThrows(
    () => d.assertValidMetricKey("lol|phooie"),
    StatsDError,
    "Key cannot include",
  );
  asserts.assertThrows(
    () => d.assertValidMetricKey("don't send newlines >> \n"),
    StatsDError,
    "Key cannot include",
  );
  asserts.assertThrows(
    () => d.assertValidMetricKey("hashes # mess # with # tags"),
    StatsDError,
    "Key cannot include",
  );
  asserts.assertThrows(
    () => d.assertValidMetricKey("these ; mess ; with ; normalized ; tags"),
    StatsDError,
    "Key cannot include",
  );
});

Deno.test("StatsDDialect.assertValidPositiveFloat accepts ok positive floats", () => {
  const d = new StatsDDialect(true);
  d.assertValidPositiveFloat(0);
  d.assertValidPositiveFloat(0.1);
  d.assertValidPositiveFloat(10);
  d.assertValidPositiveFloat(42.123456789);
  d.assertValidPositiveFloat(Math.PI);
});

Deno.test("StatsDDialect.assertValidPositiveFloat rejects bad positive floats", () => {
  const d = new StatsDDialect(true);
  asserts.assertThrows(() => d.assertValidPositiveFloat(-1), StatsDError),
    "0 or greater";
  asserts.assertThrows(
    () => d.assertValidPositiveFloat(-0.0001),
    StatsDError,
    "0 or greater",
  );
  asserts.assertThrows(
    () => d.assertValidPositiveFloat(NaN),
    StatsDError,
    "be a number",
  );
  asserts.assertThrows(
    () => d.assertValidPositiveFloat(Infinity),
    StatsDError,
    "be finite",
  );
  asserts.assertThrows(
    // @ts-expect-error Testing that strings are rejected:
    () => d.assertValidPositiveFloat("0.1"),
    StatsDError,
    "be a number",
  );
});

Deno.test("StatsDDialect.assertValidPositiveFloat accepts ok floats", () => {
  const d = new StatsDDialect(true);
  d.assertValidSignedFloat(0);
  d.assertValidSignedFloat(0.1);
  d.assertValidSignedFloat(-0.1);
  d.assertValidSignedFloat(10);
  d.assertValidSignedFloat(-10);
  d.assertValidSignedFloat(42.123456789);
  d.assertValidSignedFloat(Math.PI);
  d.assertValidSignedFloat(-Math.PI);
});

Deno.test("StatsDDialect.assertValidPositiveFloat rejects bad floats", () => {
  const d = new StatsDDialect(true);
  asserts.assertThrows(
    () => d.assertValidSignedFloat(NaN),
    StatsDError,
    "be a number",
  );
  asserts.assertThrows(
    () => d.assertValidSignedFloat(Infinity),
    StatsDError,
    "be finite",
  );
  asserts.assertThrows(
    // @ts-expect-error Testing that strings are rejected:
    () => d.assertValidSignedFloat("0.1"),
    StatsDError,
    "be a number",
  );
});

Deno.test("StatsDDialect.assertValidTags (non-UDP) accepts ok tags", () => {
  const d = new StatsDDialect(false);
  d.assertValidTags({});
  d.assertValidTags({ foo: "bar" });
  d.assertValidTags({ foo: "" });
  d.assertValidTags({
    0: "ugly",
    1: "but hey",
    2: "I won't stop you",
  });
  d.assertValidTags({
    "testing values": "123",
    " 1234.56 ": "value here",
  });
});

Deno.test("StatsDDialect.assertValidTags (UDP) accepts ok tags", () => {
  const d = new StatsDDialect(true);
  d.assertValidTags({});
  d.assertValidTags({ foo: "bar" });
  d.assertValidTags({ foo: "" });
  d.assertValidTags({ foo: false });
  d.assertValidTags({ debug: true });
  d.assertValidTags({ "𝖀𝖓𝖎𝖈𝖔𝖉𝖊": "lol" });
  d.assertValidTags({ lol: "𝖀𝖓𝖎𝖈𝖔𝖉𝖊" });
  d.assertValidTags({ lol: "𝖀𝖓𝖎𝖈𝖔𝖉𝖊" });
  d.assertValidTags({
    0: "ugly",
    1: "but hey",
    2: "I won't stop you",
  });
  d.assertValidTags({
    "testing values": "123",
    " 1234.56 ": "value here",
  });
});

Deno.test("StatsDDialect.assertValidTags (non-UDP) rejects bad tags", () => {
  const d = new StatsDDialect(false);
  asserts.assertThrows(
    // @ts-expect-error Testing that strings are rejected:
    () => d.assertValidTags("no"),
    StatsDError,
    "be an object",
  );
  asserts.assertThrows(
    // @ts-expect-error Testing null:
    () => d.assertValidTags(null),
    StatsDError,
    "be an object",
  );
  asserts.assertThrows(
    () => d.assertValidTags({ "": "123" }),
    StatsDError,
    "be empty",
  );
  asserts.assertThrows(
    () => d.assertValidTags({ "bad:key": "123" }),
    StatsDError,
    "cannot include",
  );
  asserts.assertThrows(
    () => d.assertValidTags({ 0: "bad\nvalue" }),
    StatsDError,
    "cannot include",
  );
  asserts.assertThrows(
    () => d.assertValidTags({ "𝖀𝖓𝖎𝖈𝖔𝖉𝖊": "123" }),
    StatsDError,
    "printable ASCII",
  );
  asserts.assertThrows(
    () => d.assertValidTags({ 0: "𝖀𝖓𝖎𝖈𝖔𝖉𝖊" }),
    StatsDError,
    "printable ASCII",
  );
});

Deno.test("StatsDDialect.assertValidTags (UDP) rejects bad tags", () => {
  const d = new StatsDDialect(true);
  asserts.assertThrows(
    // @ts-expect-error Testing that strings are rejected:
    () => d.assertValidTags("no"),
    StatsDError,
    "be an object",
  );
  asserts.assertThrows(
    // @ts-expect-error Testing null:
    () => d.assertValidTags(null),
    StatsDError,
    "be an object",
  );
  asserts.assertThrows(
    () => d.assertValidTags({ "": "123" }),
    StatsDError,
    "be empty",
  );
  asserts.assertThrows(
    () => d.assertValidTags({ "bad:key": "123" }),
    StatsDError,
    "cannot include",
  );
  asserts.assertThrows(
    () => d.assertValidTags({ 0: "bad\nvalue" }),
    StatsDError,
    "cannot include",
  );
});
