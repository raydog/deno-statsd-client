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
