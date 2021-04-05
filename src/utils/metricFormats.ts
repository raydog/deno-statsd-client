import * as validate from "./fieldValidations.ts";

type TagType = { [key: string]: string };

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
): string {
  val ??= 1;
  validate.assertValidKey(key);
  validate.assertValidTags(tags);
  validate.assertFloat(val);
  return `${key}:${val}|c${_sampleStr(sample)}${_tagStr(tags)}`;
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
): string {
  validate.assertValidKey(key);
  validate.assertValidTags(tags);
  validate.assertPosFloat(val);
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
): string {
  validate.assertValidKey(key);
  validate.assertValidTags(tags);
  validate.assertPosFloat(val);
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
): string {
  validate.assertValidKey(key);
  validate.assertValidTags(tags);
  validate.assertFloat(val);
  const sign = (val >= 0) ? "+" : ""; // << Positive numbers need a forced sign
  return `${key}:${sign}${val}|g${_sampleStr(sample)}${_tagStr(tags)}`;
}

/**
 * Produce the "set" string that'd be sent over the wire.
 * 
 * @private
 * @param key Metric key
 * @param val Set value
 * @param sample Sample rate
 * @param tags Tag set.
 * @throws If an input is invalid.
 * @returns Data to be sent.
 */
export function buildSetBody(
  key: string,
  val: string | number,
  sample: number,
  tags: TagType,
): string {
  validate.assertValidKey(key);
  validate.assertValidTags(tags);
  return `${key}:${val}|s${_sampleStr(sample)}${_tagStr(tags)}`;
}

// Produce the sample string for the sample-rate:
function _sampleStr(sample: number): string {
  if (sample >= 1) return "";
  return "|@" + String(sample);
}

// Produce the tag string for the tag object:
function _tagStr(tags: TagType): string {
  const str = Object.keys(tags)
    .filter((key) => tags[key])
    .map((key) => `${key}:${tags[key]}`)
    .join(",");
  return (str) ? "|#" + str : "";
}
