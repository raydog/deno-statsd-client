import { assertEquals } from "https://deno.land/std@0.92.0/testing/asserts.ts";

import * as metricFormats from "./metricFormats.ts";

Deno.test("metricFormats can build count metrics", () => {
  assertEquals(metricFormats.buildCountBody("a.b", 1, 1, {}), "a.b:1|c");
  assertEquals(
    metricFormats.buildCountBody("a.b", undefined, 1, {}),
    "a.b:1|c",
  );
  assertEquals(metricFormats.buildCountBody("a.b", 1, 0.5, {}), "a.b:1|c|@0.5");
  assertEquals(
    metricFormats.buildCountBody("a.b", 1, 1, { foo: "bar" }),
    "a.b:1|c|#foo:bar",
  );
  assertEquals(
    metricFormats.buildCountBody("a.b", 1, 0.25, {
      foo: "bar",
      host: "localhost",
    }),
    "a.b:1|c|@0.25|#foo:bar,host:localhost",
  );
  assertEquals(
    metricFormats.buildCountBody("a.b", 12, 0.25, { foo: "bar", empty: "" }),
    "a.b:12|c|@0.25|#foo:bar",
  );
  assertEquals(metricFormats.buildCountBody("a.b", -12, 0, {}), "a.b:-12|c|@0");
});

Deno.test("metricFormats can build timing metrics", () => {
  assertEquals(metricFormats.buildTimingBody("a.b", 10, 1, {}), "a.b:10|ms");
  assertEquals(
    metricFormats.buildTimingBody("a.b", 15, 0.5, {}),
    "a.b:15|ms|@0.5",
  );
  assertEquals(
    metricFormats.buildTimingBody("a.b", 0, 1, { foo: "bar" }),
    "a.b:0|ms|#foo:bar",
  );
  assertEquals(
    metricFormats.buildTimingBody("a.b", 1001, 0.25, {
      foo: "bar",
      host: "localhost",
    }),
    "a.b:1001|ms|@0.25|#foo:bar,host:localhost",
  );
  assertEquals(
    metricFormats.buildTimingBody("a.b", 12, 0.25, { foo: "bar", empty: "" }),
    "a.b:12|ms|@0.25|#foo:bar",
  );
});

Deno.test("metricFormats can build absolute gauge metrics", () => {
  assertEquals(
    metricFormats.buildAbsGaugeBody("a.b", 10.2, 1, {}),
    "a.b:10.2|g",
  );
  assertEquals(
    metricFormats.buildAbsGaugeBody("a.b", 15, 0.5, {}),
    "a.b:15|g|@0.5",
  );
  assertEquals(
    metricFormats.buildAbsGaugeBody("a.b", 0.001, 1, { foo: "bar" }),
    "a.b:0.001|g|#foo:bar",
  );
  assertEquals(
    metricFormats.buildAbsGaugeBody("a.b", 222, 0.25, {
      foo: "bar",
      host: "localhost",
    }),
    "a.b:222|g|@0.25|#foo:bar,host:localhost",
  );
  assertEquals(
    metricFormats.buildAbsGaugeBody("a.b", 12, 0.25, { foo: "bar", empty: "" }),
    "a.b:12|g|@0.25|#foo:bar",
  );
});

Deno.test("metricFormats can build relative gauge metrics", () => {
  assertEquals(
    metricFormats.buildRelGaugeBody("a.b", 10.2, 1, {}),
    "a.b:+10.2|g",
  );
  assertEquals(metricFormats.buildRelGaugeBody("a.b", 0, 1, {}), "a.b:+0|g");
  assertEquals(
    metricFormats.buildRelGaugeBody("a.b", -15, 0.5, {}),
    "a.b:-15|g|@0.5",
  );
  assertEquals(
    metricFormats.buildRelGaugeBody("a.b", 0.001, 1, { foo: "bar" }),
    "a.b:+0.001|g|#foo:bar",
  );
  assertEquals(
    metricFormats.buildRelGaugeBody("a.b", -222, 0.25, {
      foo: "bar",
      host: "localhost",
    }),
    "a.b:-222|g|@0.25|#foo:bar,host:localhost",
  );
  assertEquals(
    metricFormats.buildRelGaugeBody("a.b", 12, 0.25, { foo: "bar", empty: "" }),
    "a.b:+12|g|@0.25|#foo:bar",
  );
});

Deno.test("metricFormats can build set metrics", () => {
  assertEquals(metricFormats.buildSetBody("a.b", 10.2, 1, {}), "a.b:10.2|s");
  assertEquals(metricFormats.buildSetBody("a.b", 0, 1, {}), "a.b:0|s");
  assertEquals(
    metricFormats.buildSetBody("a.b", "foobar", 0.5, {}),
    "a.b:foobar|s|@0.5",
  );
  assertEquals(
    metricFormats.buildSetBody("a.b", "", 1, { foo: "bar" }),
    "a.b:|s|#foo:bar",
  );
  assertEquals(
    metricFormats.buildSetBody("a.b", "---", 0.25, {
      foo: "bar",
      host: "localhost",
    }),
    "a.b:---|s|@0.25|#foo:bar,host:localhost",
  );
  assertEquals(
    metricFormats.buildSetBody(
      "a.b",
      "1bc0e4ef-8100-499a-a47d-593969a44250",
      0.25,
      { foo: "bar", empty: "" },
    ),
    "a.b:1bc0e4ef-8100-499a-a47d-593969a44250|s|@0.25|#foo:bar",
  );
});
