import { Dialect } from "../types/Dialect.ts";
import { Tags } from "../types/Tags.ts";
import { InternalEventOpts } from "../types/EventOpts.ts";
import { StatsDError } from "../StatsDError.ts";
import { InternalServiceCheckOpts } from "../types/ServiceCheckOpts.ts";

const TE = new TextEncoder();
const BAD_EVENT_CHARS_RE = /[|\n]/;

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
  dialect.assertValidSetValue(val);
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

/**
 * Will format an event for datadog.
 */
export function buildEventBody(
  dialect: Dialect,
  ev: InternalEventOpts,
): string {
  dialect.assertSupportsEvents();
  dialect.assertValidTags(ev.tags);

  const title = _escapeNewlines(ev.title);
  const text = _escapeNewlines(ev.text);
  const titleLen = TE.encode(title).byteLength;
  const textLen = TE.encode(text).byteLength;
  const headerPart = `_e{${titleLen},${textLen}}:${title}|${text}`;

  const timePart = "d:" + _unix(ev.time);
  const hostPart = ev.host && "h:" + eventField("host", ev.host);
  const aggrPart = ev.aggregate && "k:" + eventField("aggregate", ev.aggregate);
  const prioPart = ev.priority && "p:" + eventField("priority", ev.priority);
  const srcPart = ev.source && "s:" + eventField("source", ev.source);
  const typePart = ev.type && "t:" + eventField("type", ev.type);
  const tagsPart = _tagStr(ev.tags, false);

  return [
    headerPart,
    timePart,
    hostPart,
    aggrPart,
    prioPart,
    srcPart,
    typePart,
    tagsPart,
  ].filter(Boolean).join("|");
}

/**
 * Will format a service check for datadog.
 */
export function buildServiceCheckBody(
  dialect: Dialect,
  sc: InternalServiceCheckOpts,
): string {
  dialect.assertSupportsEvents();
  dialect.assertValidTags(sc.tags);

  const namePart = serviceCheckField("name", sc.name);
  const statusPart = String(_serviceCheckStatus(sc.status));
  const timePart = "d:" + _unix(sc.time);
  const hostPart = sc.host && "h:" + serviceCheckField("host", sc.host);
  const tagsPart = _tagStr(sc.tags, false);
  const messagePart = sc.message &&
    "m:" + serviceCheckField("message", sc.message);

  return [
    "_sc",
    namePart,
    statusPart,
    timePart,
    hostPart,
    tagsPart,
    messagePart,
  ].filter(Boolean).join("|");
}

function _unix(d: Date): number {
  return Math.floor(d.valueOf() / 1000);
}

function _escapeNewlines(str: string): string {
  // Note: this encoding doesn't actually allow you to send a backslash followed by a n, and have it be interpretted as two chars
  // but whatever. It's datadog's format, not mine.
  return str.replace(/\n/g, "\\n");
}

function eventField(name: string, str: string): string {
  // These fields support unicode, but a "|" or "\n" would mess up the agent parsing, so reject if we find any:
  if (BAD_EVENT_CHARS_RE.test(str)) {
    throw new StatsDError(
      `Event's ${name} field can't have any '|' or '\n' characters in it`,
    );
  }

  return str;
}

function serviceCheckField(name: string, str: string): string {
  // These fields support unicode, but a "|" or "\n" would mess up the agent parsing, so reject if we find any:
  if (BAD_EVENT_CHARS_RE.test(str)) {
    throw new StatsDError(
      `Service check's ${name} field can't have any '|' or '\n' characters in it`,
    );
  }

  return str;
}

// Produce the sample string for the sample-rate:
function _sampleStr(sample: number): string {
  if (sample >= 1) return "";
  return "|@" + String(sample);
}

// Produce the tag string for the tag object:
function _tagStr(tags: Tags, includeBar = true): string {
  const str = Object.keys(tags)
    .filter((key) => tags[key])
    .map((key) => (tags[key] === true) ? key : `${key}:${tags[key]}`)
    .join(",");
  const prefix = includeBar ? "|#" : "#";
  return (str) ? prefix + str : "";
}

function _serviceCheckStatus(status: string): number {
  switch (status.toLowerCase()) {
    case "ok":
      return 0;
    case "warn":
    case "warning":
      return 1;
    case "crit":
    case "critical":
      return 2;
    default:
      return 3;
  }
}
