import { StatsDError } from "../StatsDError.ts";
import { Dialect } from "../types/Dialect.ts";
import { Tags } from "../types/Tags.ts";

const GOOD_FIRST_CHAR = /^[a-z]/i;
const BAD_CHARS_RE = /[^a-z0-9_.]/i;

export class DatadogDialect implements Dialect {
  assertValidMetricKey(key: string) {
    _assert(Boolean(key), "Key is required", key);
    _assert(GOOD_FIRST_CHAR.test(key), "Key must start with a letter", key);
    _assert(
      !BAD_CHARS_RE.test(key),
      "Key can only contain ASCII alphanumerics, '_', and '.'",
      key,
    );
    _assert(key.length < 200, "Key must be under 200 chars", key);
  }

  assertValidSignedFloat(val: number) {
    _assert(
      typeof val === "number" && !isNaN(val),
      "Value must be a number",
      val,
    );
    _assert(isFinite(val), "Value must be finite", val);
  }

  assertValidPositiveFloat(val: number) {
    this.assertValidSignedFloat(val);
    _assert(val >= 0, "Value must be 0 or greater", val);
  }

  assertValidTags(tags: Tags) {
    _assert(
      Boolean(tags) && typeof tags === "object",
      "Tags must be an object",
      tags,
    );

    for (const key of Object.keys(tags)) {
      const val = tags[key];

      // Key
      _assert(Boolean(key), "Tag key is required", val, key);
      _assert(
        GOOD_FIRST_CHAR.test(key),
        "Tag key must start with a letter",
        val,
        key,
      );
      _assert(
        !BAD_CHARS_RE.test(key),
        "Tag key can only contain ASCII alphanumerics, '_', and '.'",
        val,
        key,
      );
      _assert(key.length < 200, "Tag key must be under 200 chars", val, key);

      // Val
      if (typeof val === "string" && val) {
        _assert(Boolean(val), "Tag value is required", val, key);
        _assert(
          GOOD_FIRST_CHAR.test(val),
          "Tag value must start with a letter",
          val,
          key,
        );
        _assert(
          !BAD_CHARS_RE.test(val),
          "Tag value can only contain ASCII alphanumerics, '_', and '.'",
          val,
          key,
        );
        _assert(
          val.length < 200,
          "Tag value must be under 200 chars",
          val,
          key,
        );
      }
    }
  }
}

// Quick-and-dirty assert, to make validation easier:
function _assert(cond: boolean, failMsg: string, val: unknown, key?: string) {
  if (!cond) {
    if (key != null) val = { [key]: val };
    throw new StatsDError(`${failMsg}: ${_valString(val)}`);
  }
}

// JSON doesn't treat NaN or infinity nicely, so handle numbers differently:
function _valString(val: unknown): string {
  if (typeof val === "number") {
    return String(val);
  }
  return JSON.stringify(val);
}
