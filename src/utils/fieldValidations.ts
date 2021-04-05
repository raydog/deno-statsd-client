import { StatsDError } from "../StatsDError.ts";
import { Tags } from "../types/Tags.ts";

// If this matches, reject the key:
const BAD_CHAR_RE = /[;:#|\n]/;

// Ensures that a string is ok:
function isValidKey(key: string): boolean {
  return Boolean(key) && !BAD_CHAR_RE.test(key);
}

export function assertValidKey(key: string) {
  if (!isValidKey(key)) {
    throw new StatsDError(`Invalid key: ${key}`);
  }
}

export function assertPosFloat(val: number) {
  if (typeof val !== "number" || isNaN(val) || val < 0) {
    throw new StatsDError(`Must be number 0 or greater: ${val}`);
  }
}

export function assertFloat(val: number) {
  if (typeof val !== "number" || isNaN(val)) {
    throw new StatsDError(`Must be number: ${val}`);
  }
}

export function assertValidTags(tags: Tags) {
  if (!tags || typeof tags !== "object") {
    throw new StatsDError("Invalid tag object");
  }
  for (const key of Object.keys(tags)) {
    const val = tags[key];
    // Special-case: for empty strings, just omit this pair:
    if (val === "") continue;
    if (!isValidKey(key) || !isValidKey(val)) {
      throw new StatsDError(`Invalid tag: ${key}: ${val}`);
    }
  }
}
