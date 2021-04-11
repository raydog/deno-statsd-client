import { StatsDError } from "../StatsDError.ts";
import { Dialect } from "../types/Dialect.ts";
import { Tags } from "../types/Tags.ts";

const GOOD_FIRST_CHAR = /^[a-z]/i;

const BAD_KEY_CHAR_RE = /[:|\n]/;
const NON_ASCII_RE = /[^\x20-\x7e]/;
const BAD_TAG_KEY_CHAR_RE = /[,|:\n]/;
const BAD_TAG_VAL_CHAR_RE = /[,|\n]/;

export class DatadogDialect implements Dialect {
  assertValidMetricKey(key: string) {
    _assert(Boolean(key), "Key is required", key);
    _assert(GOOD_FIRST_CHAR.test(key), "Key must start with a letter", key);
    _assert(
      !NON_ASCII_RE.test(key),
      "Key can only contain ASCII characters",
      key,
    );
    _assert(
      !BAD_KEY_CHAR_RE.test(key),
      "Key can't have ':', '|', or '\n' characters",
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

  assertValidSetValue(val: number | string) {
    if (typeof val === "number") {
      _assert(!isNaN(val), "Set value can't be NaN", val);
      _assert(isFinite(val), "Set value must be finite", val);
    }
    if (typeof val === "string") {
      _assert(
        !BAD_KEY_CHAR_RE.test(val),
        "Set value cannot include ':', '|', or '\\n'",
        val,
      );
    }
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
        !BAD_TAG_KEY_CHAR_RE.test(key),
        "Tag key cannot have ',', '|', ':', or '\\n'",
        val,
        key,
      );
      _assert(key.length < 200, "Tag key must be under 200 chars", val, key);

      // Val
      if (typeof val === "string" && val) {
        _assert(Boolean(val), "Tag value is required", val, key);
        _assert(
          !BAD_TAG_VAL_CHAR_RE.test(val),
          "Tag value cannot have ',', '|', or '\\n'",
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

  assertSupportsHistogram() {
  }

  assertSupportsDistribution() {
  }

  assertSupportsEvents() {
  }

  assertSupportsServiceChecks() {
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
