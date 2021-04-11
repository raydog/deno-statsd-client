import { asserts } from "../../testDeps.ts";
import { StatsDDialect } from "../dialects/StatsDDialect.ts";
import { DatadogDialect } from "../dialects/DatadogDialect.ts";
import * as formats from "./formats.ts";

Deno.test("formats can build count metrics", () => {
  const d = new StatsDDialect(true);
  asserts.assertEquals(
    formats.buildCountBody(d, "a.b", 1, 1, {}),
    "a.b:1|c",
  );
  asserts.assertEquals(
    formats.buildCountBody(d, "a.b", undefined, 1, {}),
    "a.b:1|c",
  );
  asserts.assertEquals(
    formats.buildCountBody(d, "a.b", 1, 0.5, {}),
    "a.b:1|c|@0.5",
  );
  asserts.assertEquals(
    formats.buildCountBody(d, "a.b", 1, 1, { foo: "bar" }),
    "a.b:1|c|#foo:bar",
  );
  asserts.assertEquals(
    formats.buildCountBody(d, "a.b", 1, 0.25, {
      foo: "bar",
      host: "localhost",
    }),
    "a.b:1|c|@0.25|#foo:bar,host:localhost",
  );
  asserts.assertEquals(
    formats.buildCountBody(d, "a.b", 12, 0.25, { foo: "bar", empty: "" }),
    "a.b:12|c|@0.25|#foo:bar",
  );
  asserts.assertEquals(
    formats.buildCountBody(d, "a.b", -12, 0, {}),
    "a.b:-12|c|@0",
  );
});

Deno.test("formats can build timing metrics", () => {
  const d = new StatsDDialect(true);
  asserts.assertEquals(
    formats.buildTimingBody(d, "a.b", 10, 1, {}),
    "a.b:10|ms",
  );
  asserts.assertEquals(
    formats.buildTimingBody(d, "a.b", 15, 0.5, {}),
    "a.b:15|ms|@0.5",
  );
  asserts.assertEquals(
    formats.buildTimingBody(d, "a.b", 0, 1, { foo: "bar" }),
    "a.b:0|ms|#foo:bar",
  );
  asserts.assertEquals(
    formats.buildTimingBody(d, "a.b", 1001, 0.25, {
      foo: "bar",
      host: "localhost",
    }),
    "a.b:1001|ms|@0.25|#foo:bar,host:localhost",
  );
  asserts.assertEquals(
    formats.buildTimingBody(d, "a.b", 12, 0.25, {
      foo: "bar",
      empty: "",
    }),
    "a.b:12|ms|@0.25|#foo:bar",
  );
});

Deno.test("formats can build absolute gauge metrics", () => {
  const d = new StatsDDialect(true);
  asserts.assertEquals(
    formats.buildAbsGaugeBody(d, "a.b", 10.2, 1, {}),
    "a.b:10.2|g",
  );
  asserts.assertEquals(
    formats.buildAbsGaugeBody(d, "a.b", 15, 0.5, {}),
    "a.b:15|g|@0.5",
  );
  asserts.assertEquals(
    formats.buildAbsGaugeBody(d, "a.b", 0.001, 1, { foo: "bar" }),
    "a.b:0.001|g|#foo:bar",
  );
  asserts.assertEquals(
    formats.buildAbsGaugeBody(d, "a.b", 222, 0.25, {
      foo: "bar",
      host: "localhost",
    }),
    "a.b:222|g|@0.25|#foo:bar,host:localhost",
  );
  asserts.assertEquals(
    formats.buildAbsGaugeBody(d, "a.b", 12, 0.25, {
      foo: "bar",
      empty: "",
    }),
    "a.b:12|g|@0.25|#foo:bar",
  );
});

Deno.test("formats can build relative gauge metrics", () => {
  const d = new StatsDDialect(true);
  asserts.assertEquals(
    formats.buildRelGaugeBody(d, "a.b", 10.2, 1, {}),
    "a.b:+10.2|g",
  );
  asserts.assertEquals(
    formats.buildRelGaugeBody(d, "a.b", 0, 1, {}),
    "a.b:+0|g",
  );
  asserts.assertEquals(
    formats.buildRelGaugeBody(d, "a.b", -15, 0.5, {}),
    "a.b:-15|g|@0.5",
  );
  asserts.assertEquals(
    formats.buildRelGaugeBody(d, "a.b", 0.001, 1, { foo: "bar" }),
    "a.b:+0.001|g|#foo:bar",
  );
  asserts.assertEquals(
    formats.buildRelGaugeBody(d, "a.b", -222, 0.25, {
      foo: "bar",
      host: "localhost",
    }),
    "a.b:-222|g|@0.25|#foo:bar,host:localhost",
  );
  asserts.assertEquals(
    formats.buildRelGaugeBody(d, "a.b", 12, 0.25, {
      foo: "bar",
      empty: "",
    }),
    "a.b:+12|g|@0.25|#foo:bar",
  );
});

Deno.test("formats can build set metrics", () => {
  const d = new StatsDDialect(true);
  asserts.assertEquals(
    formats.buildSetBody(d, "a.b", 10.2, 1, {}),
    "a.b:10.2|s",
  );
  asserts.assertEquals(
    formats.buildSetBody(d, "a.b", 0, 1, {}),
    "a.b:0|s",
  );
  asserts.assertEquals(
    formats.buildSetBody(d, "a.b", "foobar", 0.5, {}),
    "a.b:foobar|s|@0.5",
  );
  asserts.assertEquals(
    formats.buildSetBody(d, "a.b", "", 1, { foo: "bar" }),
    "a.b:|s|#foo:bar",
  );
  asserts.assertEquals(
    formats.buildSetBody(d, "a.b", "---", 0.25, {
      foo: "bar",
      host: "localhost",
    }),
    "a.b:---|s|@0.25|#foo:bar,host:localhost",
  );
  asserts.assertEquals(
    formats.buildSetBody(
      d,
      "a.b",
      "1bc0e4ef-8100-499a-a47d-593969a44250",
      0.25,
      { foo: "bar", empty: "" },
    ),
    "a.b:1bc0e4ef-8100-499a-a47d-593969a44250|s|@0.25|#foo:bar",
  );
});

Deno.test("formats can build event metrics", () => {
  const d = new DatadogDialect();
  asserts.assertEquals(
    formats.buildEventBody(d, {
      title: "foo bar",
      text: "text body",
      time: new Date("2020-01-02T03:04:05.678Z"),
      host: "server-42",
      priority: "normal",
      type: "info",
      tags: { thing: "a", other: "b" },
    }),
    "_e{7,9}:foo bar|text body|d:1577934245|h:server-42|p:normal|t:info|#thing:a,other:b",
  );
  asserts.assertEquals(
    formats.buildEventBody(d, {
      title: "some other title string",
      text: "can escape\nnewlines",
      time: new Date("2020-01-02T03:04:05.678Z"),
      host: "",
      priority: "normal",
      type: "error",
      tags: {},
    }),
    "_e{23,20}:some other title string|can escape\\nnewlines|d:1577934245|p:normal|t:error",
  );
  asserts.assertEquals(
    formats.buildEventBody(d, {
      title: "𝖀𝖓𝖎𝖈𝖔𝖉𝖊",
      text: "𝖀𝖓𝖎𝖈𝖔𝖉𝖊\n𝖀𝖓𝖎𝖈𝖔𝖉𝖊",
      time: new Date("2020-01-02T03:04:05.678Z"),
      host: "𝖀𝖓𝖎𝖈𝖔𝖉𝖊",
      priority: "normal",
      type: "error",
      tags: { "𝖀𝖓𝖎𝖈𝖔𝖉𝖊": "𝖀𝖓𝖎𝖈𝖔𝖉𝖊" },
    }),
    "_e{28,58}:𝖀𝖓𝖎𝖈𝖔𝖉𝖊|𝖀𝖓𝖎𝖈𝖔𝖉𝖊\\n𝖀𝖓𝖎𝖈𝖔𝖉𝖊|d:1577934245|h:𝖀𝖓𝖎𝖈𝖔𝖉𝖊|p:normal|t:error|#𝖀𝖓𝖎𝖈𝖔𝖉𝖊:𝖀𝖓𝖎𝖈𝖔𝖉𝖊",
  );
});

Deno.test("formats can build service check metrics", () => {
  const d = new DatadogDialect();
  asserts.assertEquals(
    formats.buildServiceCheckBody(d, {
      name: "foo bar",
      status: "ok",
      time: new Date("2020-01-02T03:04:05.678Z"),
      host: "server-42",
      tags: { a: "one", b: "two" },
      message: "service msg",
    }),
    "_sc|foo bar|0|d:1577934245|h:server-42|#a:one,b:two|m:service msg",
  );
  asserts.assertEquals(
    formats.buildServiceCheckBody(d, {
      name: "𝖀𝖓𝖎𝖈𝖔𝖉𝖊",
      status: "warning",
      time: new Date("2020-01-02T03:04:05.678Z"),
      host: "𝖀𝖓𝖎𝖈𝖔𝖉𝖊-42",
      tags: { "𝖀𝖓𝖎𝖈𝖔𝖉𝖊": "𝖀𝖓𝖎𝖈𝖔𝖉𝖊" },
      message: "𝖀𝖓𝖎𝖈𝖔𝖉𝖊 message",
    }),
    "_sc|𝖀𝖓𝖎𝖈𝖔𝖉𝖊|1|d:1577934245|h:𝖀𝖓𝖎𝖈𝖔𝖉𝖊-42|#𝖀𝖓𝖎𝖈𝖔𝖉𝖊:𝖀𝖓𝖎𝖈𝖔𝖉𝖊|m:𝖀𝖓𝖎𝖈𝖔𝖉𝖊 message",
  );
  asserts.assertEquals(
    formats.buildServiceCheckBody(d, {
      name: "name",
      status: "critical",
      time: new Date("2020-01-02T03:04:05.678Z"),
      host: "",
      tags: {},
      message: "",
    }),
    "_sc|name|2|d:1577934245",
  );
  asserts.assertEquals(
    formats.buildServiceCheckBody(d, {
      name: "lol testing the final status",
      status: "unknown",
      time: new Date("2020-01-02T03:04:05.678Z"),
      host: "",
      tags: {},
      message: "and a message",
    }),
    "_sc|lol testing the final status|3|d:1577934245|m:and a message",
  );
});
