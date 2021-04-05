import { assertThrows } from "https://deno.land/std@0.92.0/testing/asserts.ts";
import { StatsDError } from "../StatsDError.ts";
import * as fieldValidations from "./fieldValidations.ts";

Deno.test("fieldValidations accepts ok keys", () => {
  fieldValidations.assertValidKey("a");
  fieldValidations.assertValidKey("http.server.time");
  fieldValidations.assertValidKey("deno.this is a metric.foobar");
  fieldValidations.assertValidKey(
    "lol.<script>this is still ok</script>.I_dunno",
  );
});

Deno.test("fieldValidations rejects bad keys", () => {
  assertThrows(() => fieldValidations.assertValidKey("a:b"), StatsDError);
  assertThrows(
    () => fieldValidations.assertValidKey("lol|phooie"),
    StatsDError,
  );
  assertThrows(
    () => fieldValidations.assertValidKey("don't send newlines >> \n"),
    StatsDError,
  );
  assertThrows(
    () => fieldValidations.assertValidKey("hashes # mess # with # tags"),
    StatsDError,
  );
  assertThrows(
    () =>
      fieldValidations.assertValidKey(
        "semi-colons ; mess ; with ; how; tages ; get ; normalized",
      ),
    StatsDError,
  );
});

Deno.test("fieldValidations accepts ok positive floats", () => {
  fieldValidations.assertPosFloat(0);
  fieldValidations.assertPosFloat(0.1);
  fieldValidations.assertPosFloat(10);
  fieldValidations.assertPosFloat(42.123456789);
  fieldValidations.assertPosFloat(Math.PI);
});

Deno.test("fieldValidations rejects bad positive floats", () => {
  assertThrows(() => fieldValidations.assertPosFloat(-1), StatsDError);
  assertThrows(() => fieldValidations.assertPosFloat(-0.0001), StatsDError);
  assertThrows(() => fieldValidations.assertPosFloat(NaN), StatsDError);
  // @ts-expect-error Testing that strings are rejected:
  assertThrows(() => fieldValidations.assertPosFloat("0.1"), StatsDError);
});

Deno.test("fieldValidations accepts ok floats", () => {
  fieldValidations.assertFloat(0);
  fieldValidations.assertFloat(0.1);
  fieldValidations.assertFloat(-0.1);
  fieldValidations.assertFloat(10);
  fieldValidations.assertFloat(-10);
  fieldValidations.assertFloat(42.123456789);
  fieldValidations.assertFloat(Math.PI);
  fieldValidations.assertFloat(-Math.PI);
});

Deno.test("fieldValidations rejects bad floats", () => {
  assertThrows(() => fieldValidations.assertFloat(NaN), StatsDError);
  // @ts-expect-error Testing that strings are rejected:
  assertThrows(() => fieldValidations.assertFloat("0.1"), StatsDError);
});

Deno.test("fieldValidations accepts ok tags", () => {
  fieldValidations.assertValidTags({});
  fieldValidations.assertValidTags({ foo: "bar" });
  fieldValidations.assertValidTags({ foo: "" });
  fieldValidations.assertValidTags({
    0: "ugly",
    1: "but hey",
    2: "I won't stop you",
  });
  fieldValidations.assertValidTags({
    "testing values": "123",
    " 1234.56 ": "value here",
  });
});

Deno.test("fieldValidations rejects bad tags", () => {
  // @ts-expect-error Testing that strings are rejected:
  assertThrows(() => fieldValidations.assertValidTags("no"), StatsDError);
  // @ts-expect-error Testing null:
  assertThrows(() => fieldValidations.assertValidTags(null), StatsDError);
  assertThrows(
    () => fieldValidations.assertValidTags({ "bad:key": "123" }),
    StatsDError,
  );
  assertThrows(
    () => fieldValidations.assertValidTags({ 0: "bad\nvalue" }),
    StatsDError,
  );
});
