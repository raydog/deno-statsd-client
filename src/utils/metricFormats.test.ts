import { asserts } from "../../testDeps.ts";
import { StatsDDialect } from "../dialects/StatsDDialect.ts";
import * as metricFormats from "./metricFormats.ts";

Deno.test("metricFormats can build count metrics", () => {
  const d = new StatsDDialect(true);
  asserts.assertEquals(
    metricFormats.buildCountBody(d, "a.b", 1, 1, {}),
    "a.b:1|c",
  );
  asserts.assertEquals(
    metricFormats.buildCountBody(d, "a.b", undefined, 1, {}),
    "a.b:1|c",
  );
  asserts.assertEquals(
    metricFormats.buildCountBody(d, "a.b", 1, 0.5, {}),
    "a.b:1|c|@0.5",
  );
  asserts.assertEquals(
    metricFormats.buildCountBody(d, "a.b", 1, 1, { foo: "bar" }),
    "a.b:1|c|#foo:bar",
  );
  asserts.assertEquals(
    metricFormats.buildCountBody(d, "a.b", 1, 0.25, {
      foo: "bar",
      host: "localhost",
    }),
    "a.b:1|c|@0.25|#foo:bar,host:localhost",
  );
  asserts.assertEquals(
    metricFormats.buildCountBody(d, "a.b", 12, 0.25, { foo: "bar", empty: "" }),
    "a.b:12|c|@0.25|#foo:bar",
  );
  asserts.assertEquals(
    metricFormats.buildCountBody(d, "a.b", -12, 0, {}),
    "a.b:-12|c|@0",
  );
});

Deno.test("metricFormats can build timing metrics", () => {
  const d = new StatsDDialect(true);
  asserts.assertEquals(
    metricFormats.buildTimingBody(d, "a.b", 10, 1, {}),
    "a.b:10|ms",
  );
  asserts.assertEquals(
    metricFormats.buildTimingBody(d, "a.b", 15, 0.5, {}),
    "a.b:15|ms|@0.5",
  );
  asserts.assertEquals(
    metricFormats.buildTimingBody(d, "a.b", 0, 1, { foo: "bar" }),
    "a.b:0|ms|#foo:bar",
  );
  asserts.assertEquals(
    metricFormats.buildTimingBody(d, "a.b", 1001, 0.25, {
      foo: "bar",
      host: "localhost",
    }),
    "a.b:1001|ms|@0.25|#foo:bar,host:localhost",
  );
  asserts.assertEquals(
    metricFormats.buildTimingBody(d, "a.b", 12, 0.25, {
      foo: "bar",
      empty: "",
    }),
    "a.b:12|ms|@0.25|#foo:bar",
  );
});

Deno.test("metricFormats can build absolute gauge metrics", () => {
  const d = new StatsDDialect(true);
  asserts.assertEquals(
    metricFormats.buildAbsGaugeBody(d, "a.b", 10.2, 1, {}),
    "a.b:10.2|g",
  );
  asserts.assertEquals(
    metricFormats.buildAbsGaugeBody(d, "a.b", 15, 0.5, {}),
    "a.b:15|g|@0.5",
  );
  asserts.assertEquals(
    metricFormats.buildAbsGaugeBody(d, "a.b", 0.001, 1, { foo: "bar" }),
    "a.b:0.001|g|#foo:bar",
  );
  asserts.assertEquals(
    metricFormats.buildAbsGaugeBody(d, "a.b", 222, 0.25, {
      foo: "bar",
      host: "localhost",
    }),
    "a.b:222|g|@0.25|#foo:bar,host:localhost",
  );
  asserts.assertEquals(
    metricFormats.buildAbsGaugeBody(d, "a.b", 12, 0.25, {
      foo: "bar",
      empty: "",
    }),
    "a.b:12|g|@0.25|#foo:bar",
  );
});

Deno.test("metricFormats can build relative gauge metrics", () => {
  const d = new StatsDDialect(true);
  asserts.assertEquals(
    metricFormats.buildRelGaugeBody(d, "a.b", 10.2, 1, {}),
    "a.b:+10.2|g",
  );
  asserts.assertEquals(
    metricFormats.buildRelGaugeBody(d, "a.b", 0, 1, {}),
    "a.b:+0|g",
  );
  asserts.assertEquals(
    metricFormats.buildRelGaugeBody(d, "a.b", -15, 0.5, {}),
    "a.b:-15|g|@0.5",
  );
  asserts.assertEquals(
    metricFormats.buildRelGaugeBody(d, "a.b", 0.001, 1, { foo: "bar" }),
    "a.b:+0.001|g|#foo:bar",
  );
  asserts.assertEquals(
    metricFormats.buildRelGaugeBody(d, "a.b", -222, 0.25, {
      foo: "bar",
      host: "localhost",
    }),
    "a.b:-222|g|@0.25|#foo:bar,host:localhost",
  );
  asserts.assertEquals(
    metricFormats.buildRelGaugeBody(d, "a.b", 12, 0.25, {
      foo: "bar",
      empty: "",
    }),
    "a.b:+12|g|@0.25|#foo:bar",
  );
});

Deno.test("metricFormats can build set metrics", () => {
  const d = new StatsDDialect(true);
  asserts.assertEquals(
    metricFormats.buildSetBody(d, "a.b", 10.2, 1, {}),
    "a.b:10.2|s",
  );
  asserts.assertEquals(
    metricFormats.buildSetBody(d, "a.b", 0, 1, {}),
    "a.b:0|s",
  );
  asserts.assertEquals(
    metricFormats.buildSetBody(d, "a.b", "foobar", 0.5, {}),
    "a.b:foobar|s|@0.5",
  );
  asserts.assertEquals(
    metricFormats.buildSetBody(d, "a.b", "", 1, { foo: "bar" }),
    "a.b:|s|#foo:bar",
  );
  asserts.assertEquals(
    metricFormats.buildSetBody(d, "a.b", "---", 0.25, {
      foo: "bar",
      host: "localhost",
    }),
    "a.b:---|s|@0.25|#foo:bar,host:localhost",
  );
  asserts.assertEquals(
    metricFormats.buildSetBody(
      d,
      "a.b",
      "1bc0e4ef-8100-499a-a47d-593969a44250",
      0.25,
      { foo: "bar", empty: "" },
    ),
    "a.b:1bc0e4ef-8100-499a-a47d-593969a44250|s|@0.25|#foo:bar",
  );
});
