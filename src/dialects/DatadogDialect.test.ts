import { asserts } from "../../testDeps.ts";
import { StatsDError } from "../StatsDError.ts";
import { DatadogDialect } from "./DatadogDialect.ts";

Deno.test("DatadogDialect.assertValidMetricKey accepts ok keys", () => {
  const d = new DatadogDialect();
  d.assertValidMetricKey("a");
  d.assertValidMetricKey("http.server.time");
  d.assertValidMetricKey("http.route42.whatever");
  d.assertValidMetricKey("deno.this_is_a_metric.foobar");
});

Deno.test("DatadogDialect.assertValidMetricKey rejects bad keys", () => {
  const d = new DatadogDialect();
  asserts.assertThrows(
    () => d.assertValidMetricKey(""),
    StatsDError,
    "Key is required",
  );
  asserts.assertThrows(
    () => d.assertValidMetricKey("111"),
    StatsDError,
    "Key must start",
  );
  asserts.assertThrows(
    () => d.assertValidMetricKey("foobar*"),
    StatsDError,
    "only contain ASCII",
  );
  asserts.assertThrows(
    () => d.assertValidMetricKey("lol.𝖀𝖓𝖎𝖈𝖔𝖉𝖊"),
    StatsDError,
    "only contain ASCII",
  );
  asserts.assertThrows(
    () => d.assertValidMetricKey("a".repeat(200)),
    StatsDError,
    "under 200",
  );
});

Deno.test("DatadogDialect.assertValidPositiveFloat accepts ok positive floats", () => {
  const d = new DatadogDialect();
  d.assertValidPositiveFloat(0);
  d.assertValidPositiveFloat(0.1);
  d.assertValidPositiveFloat(10);
  d.assertValidPositiveFloat(42.123456789);
  d.assertValidPositiveFloat(Math.PI);
});

Deno.test("DatadogDialect.assertValidPositiveFloat rejects bad positive floats", () => {
  const d = new DatadogDialect();
  asserts.assertThrows(
    () => d.assertValidPositiveFloat(-1),
    StatsDError,
    "0 or greater",
  );
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

Deno.test("DatadogDialect.assertValidPositiveFloat accepts ok floats", () => {
  const d = new DatadogDialect();
  d.assertValidSignedFloat(0);
  d.assertValidSignedFloat(0.1);
  d.assertValidSignedFloat(-0.1);
  d.assertValidSignedFloat(10);
  d.assertValidSignedFloat(-10);
  d.assertValidSignedFloat(42.123456789);
  d.assertValidSignedFloat(Math.PI);
  d.assertValidSignedFloat(-Math.PI);
});

Deno.test("DatadogDialect.assertValidPositiveFloat rejects bad floats", () => {
  const d = new DatadogDialect();
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

Deno.test("DatadogDialect.assertValidTags accepts ok tags", () => {
  const d = new DatadogDialect();
  d.assertValidTags({});
  d.assertValidTags({ foo: "bar" });
  d.assertValidTags({ foo: "" });
  d.assertValidTags({
    "testing_values": "lol_123",
    "a1234.56": "value_Here",
  });
});

Deno.test("DatadogDialect.assertValidTags rejects bad tags", () => {
  const d = new DatadogDialect();
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
    () => d.assertValidTags({ "": "foo" }),
    StatsDError,
    "is required",
  );
  asserts.assertThrows(
    () => d.assertValidTags({ "bad:key": "foo" }),
    StatsDError,
    "only contain ASCII",
  );
  asserts.assertThrows(
    () => d.assertValidTags({ "host": "bad\nvalue" }),
    StatsDError,
    "only contain ASCII",
  );
  asserts.assertThrows(
    () => d.assertValidTags({ "blah𝖀𝖓𝖎𝖈𝖔𝖉𝖊": "foobar" }),
    StatsDError,
    "only contain ASCII",
  );
  asserts.assertThrows(
    () => d.assertValidTags({ "region": "foo𝖀𝖓𝖎𝖈𝖔𝖉𝖊" }),
    StatsDError,
    "only contain ASCII",
  );
});
