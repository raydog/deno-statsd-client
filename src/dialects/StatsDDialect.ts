import { StatsDError } from "../StatsDError.ts";
import { Dialect } from "../types/Dialect.ts";
import { Tags } from "../types/Tags.ts";

const BAD_KEY_CHAR_RE = /[;:#|\n]/;
const NON_ASCII_RE = /[^\x20-\x7e]/;
const BAD_TAG_CHAR_RE = /[:#=|\n]/;

export class StatsDDialect implements Dialect {
  #isUDP: boolean;

  /**
   * StatsD only asserts an ASCII encoding for socket-based protocols, so for UDP connections, allow UTF-8, and...
   * it might work?
   * 
   * @param isUDP 
   */
  constructor(isUDP: boolean) {
    this.#isUDP = isUDP;
  }

  assertValidMetricKey(key: string) {
    _assert(Boolean(key), "Key is required", key);
    _assert(
      !BAD_KEY_CHAR_RE.test(key),
      "Key cannot include ';' ':' '#' '|' or '\\n'",
      key,
    );
    if (!this.#isUDP) {
      _assert(
        !NON_ASCII_RE.test(key),
        "Key must be all printable ASCII characters",
        key,
      );
    }
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
        "Set value cannot include ';', ':', '#', '|', or '\\n'",
        val,
      );
      if (!this.#isUDP) {
        _assert(
          !NON_ASCII_RE.test(val),
          "Set value must be all printable ASCII characters",
          val,
        );
      }
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
      _assert(Boolean(key), "Tag key cannot be empty", val, key);
      _assert(
        !BAD_TAG_CHAR_RE.test(key),
        "Tag key cannot include '#' ':' '=' '|' or '\\n'",
        val,
        key,
      );
      if (!this.#isUDP) {
        _assert(
          !NON_ASCII_RE.test(key),
          "must be all printable ASCII characters'",
          val,
          key,
        );
      }

      // Val
      if (typeof val === "string" && val) {
        _assert(
          !BAD_TAG_CHAR_RE.test(val),
          "Tag value cannot include '#' ':' '=' '|' or '\\n'",
          val,
          key,
        );
        if (!this.#isUDP) {
          _assert(
            !NON_ASCII_RE.test(val),
            "Tag value must be all printable ASCII characters'",
            val,
            key,
          );
        }
      }
    }
  }

  assertSupportsHistogram() {
    throw new StatsDError(
      "Histograms are only supported in clients with the Datadog dialect. Consider using a timer",
    );
  }

  assertSupportsDistribution() {
    throw new StatsDError(
      "Distributions are only supported in clients with the Datadog dialect. Consider using a timer",
    );
  }

  assertSupportsEvents() {
    throw new StatsDError(
      "Events are only supported in clients with the Datadog dialect",
    );
  }

  assertSupportsServiceChecks() {
    throw new StatsDError(
      "Service checks are only supported in clients with the Datadog dialect",
    );
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
