import { StatsDError } from "./StatsDError.ts";

type TagType = { [key: string]: string };

// If this matches, reject the key:
const BAD_CHAR_RE = /[;:#|\n]/;

/**
 * Produce the "count" string that'd be sent over the wire.
 * 
 * @private
 * @param key Metric key
 * @param val Metric value (default is 1)
 * @param sample Sample rate
 * @param tags Tag set.
 * @throws If an input is invalid.
 * @returns Data to be sent.
 */
export function buildCountBody(
  key: string,
  val: number | undefined,
  sample: number,
  tags: TagType,
) {
  assertValidKey(key);
  assertValidTags(tags);
  return `${key}:${val ?? 1}|c${_sampleStr(sample)}${_tagStr(tags)}`;
}

/**
 * Produce the "timing" string that'd be sent over the wire.
 * 
 * @private
 * @param key Metric key
 * @param val Metric value (Must be positive.)
 * @param sample Sample rate
 * @param tags Tag set.
 * @throws If an input is invalid.
 * @returns Data to be sent.
 */
export function buildTimingBody(
  key: string,
  val: number,
  sample: number,
  tags: TagType,
) {
  assertValidKey(key);
  assertValidTags(tags);
  assertPosFloat(val);
  return `${key}:${val}|ms${_sampleStr(sample)}${_tagStr(tags)}`;
}

/**
 * Produce the absolute "gauge" string that'd be sent over the wire.
 * 
 * @private
 * @param key Metric key
 * @param val Metric value (Must be positive.)
 * @param sample Sample rate
 * @param tags Tag set.
 * @throws If an input is invalid.
 * @returns Data to be sent.
 */
export function buildAbsGaugeBody(
  key: string,
  val: number,
  sample: number,
  tags: TagType,
) {
  assertValidKey(key);
  assertValidTags(tags);
  assertPosFloat(val);
  return `${key}:${val}|g${_sampleStr(sample)}${_tagStr(tags)}`;
}

/**
 * Produce the relative "gauge" string that'd be sent over the wire.
 * 
 * @private
 * @param key Metric key
 * @param val Metric delta
 * @param sample Sample rate
 * @param tags Tag set.
 * @throws If an input is invalid.
 * @returns Data to be sent.
 */
export function buildRelGaugeBody(
  key: string,
  val: number,
  sample: number,
  tags: TagType,
) {
  assertValidKey(key);
  assertValidTags(tags);
  assertFloat(val);
  const sign = (val >= 0) ? "+" : ""; // << Positive numbers need a forced sign
  return `${key}:${sign}${val}|g${_sampleStr(sample)}${_tagStr(tags)}`;
}

// Ensures that a string is ok:
function isValidKey(key: string): boolean {
  return !BAD_CHAR_RE.test(key);
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

export function assertValidTags(tags: TagType) {
  for (const key of Object.keys(tags)) {
    const val = tags[key];
    if (!isValidKey(key) || !isValidKey(val)) {
      throw new StatsDError(`Invalid tag: ${key}: ${val}`);
    }
  }
}

// Produce the sample string for the sample-rate:
function _sampleStr(sample: number): string {
  if (sample >= 1) return "";
  return "|@" + String(sample);
}

// Produce the tag string for the tag object:
function _tagStr(tags: TagType): string {
  const str = Object.keys(tags)
    .map((key) => `${key}:${tags[key]}`)
    .join(",");
  return (str) ? "|#" + str : "";
}
