import { Dialect } from "../types/Dialect.ts";
import { Tags } from "../types/Tags.ts";

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
  dialect: Dialect,
  key: string,
  val: number | undefined,
  sample: number,
  tags: Tags,
): string {
  val ??= 1;
  dialect.assertValidMetricKey(key);
  dialect.assertValidSignedFloat(val);
  dialect.assertValidTags(tags);
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
  dialect: Dialect,
  key: string,
  val: number,
  sample: number,
  tags: Tags,
): string {
  dialect.assertValidMetricKey(key);
  dialect.assertValidPositiveFloat(val);
  dialect.assertValidTags(tags);
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
  dialect: Dialect,
  key: string,
  val: number,
  sample: number,
  tags: Tags,
): string {
  dialect.assertValidMetricKey(key);
  dialect.assertValidPositiveFloat(val);
  dialect.assertValidTags(tags);
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
  dialect: Dialect,
  key: string,
  val: number,
  sample: number,
  tags: Tags,
): string {
  dialect.assertValidMetricKey(key);
  dialect.assertValidSignedFloat(val);
  dialect.assertValidTags(tags);
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
  dialect: Dialect,
  key: string,
  val: string | number,
  sample: number,
  tags: Tags,
): string {
  dialect.assertValidMetricKey(key);
  dialect.assertValidTags(tags);
  return `${key}:${val}|s${_sampleStr(sample)}${_tagStr(tags)}`;
}

/**
 * Produce the "histogram" string that'd be sent over the wire.
 * 
 * @private
 * @param key Metric key
 * @param val Histogram value
 * @param sample Sample rate
 * @param tags Tag set.
 * @throws If an input is invalid.
 * @returns Data to be sent.
 */
export function buildHistogramBody(
  dialect: Dialect,
  key: string,
  val: number,
  sample: number,
  tags: Tags,
): string {
  dialect.assertSupportsHistogram();
  dialect.assertValidMetricKey(key);
  dialect.assertValidPositiveFloat(val);
  dialect.assertValidTags(tags);
  return `${key}:${val}|h${_sampleStr(sample)}${_tagStr(tags)}`;
}

/**
 * Produce the "distribution" string that'd be sent over the wire.
 * 
 * @private
 * @param key Metric key
 * @param val Distribution value
 * @param sample Sample rate
 * @param tags Tag set.
 * @throws If an input is invalid.
 * @returns Data to be sent.
 */
export function buildDistributionBody(
  dialect: Dialect,
  key: string,
  val: number,
  sample: number,
  tags: Tags,
): string {
  dialect.assertSupportsDistribution();
  dialect.assertValidMetricKey(key);
  dialect.assertValidPositiveFloat(val);
  dialect.assertValidTags(tags);
  return `${key}:${val}|d${_sampleStr(sample)}${_tagStr(tags)}`;
}

// Produce the sample string for the sample-rate:
function _sampleStr(sample: number): string {
  if (sample >= 1) return "";
  return "|@" + String(sample);
}

// Produce the tag string for the tag object:
function _tagStr(tags: Tags): string {
  const str = Object.keys(tags)
    .filter((key) => tags[key])
    .map((key) => (tags[key] === true) ? key : `${key}:${tags[key]}`)
    .join(",");
  return (str) ? "|#" + str : "";
}
