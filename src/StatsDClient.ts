import { Client } from "./types/Client.ts";
import { UDPClient } from "./network/UDPClient.ts";
import { LibConfig } from "./types/LibConfig.ts";
import { StatsDError } from "./StatsDError.ts";
import { MetricOpts } from "./types/MetricOpts.ts";
import * as metricFormats from "./metricFormats.ts";

type Tags = { [key: string]: string };

/**
 * StatsD client. Use this to send data to a StatsD-speaking backend.
 */
export class StatsDClient {
  #client: Client;

  #globalOpts: Required<MetricOpts>;
  #safeSampleRate: boolean;

  /**
   * Build a new client. This client will have its own connection to the remote StatsD server.
   * 
   * If no config object is passed in, we'll 100% fall back on default settings. (localhost:8125, UDP, ...)
   * 
   * @param conf Settings.
   */
  constructor(conf?: LibConfig) {
    const maxDelay = conf?.maxDelayMs ?? 1000;
    this.#client = _connect(conf?.server, maxDelay);
    this.#globalOpts = {
      sampleRate: conf?.sampleRate ?? 1.0,
      tags: conf?.globalTags ?? {},
    };
    this.#safeSampleRate = conf?.safeSampleRate ?? true;
  }

  /**
   * Send a "count" metric. This is used to track the number of things.
   * 
   * @example
   *   // Count the number of times a route was used:
   *  client.count("routes.get_api_resource");
   * 
   * @example
   *   // Count the number of items purchased:
   *   client.count("store.widgets.purchased", order.items.length);
   * 
   * @param key  Metric key
   * @param num  Number of things (Default is 1)
   * @param opts Extra options
   */
  count(key: string, num = 1, opts?: MetricOpts) {
    const sample = _getSampling(
      this.#globalOpts,
      opts,
      true,
      this.#safeSampleRate,
    );
    const tags = _getTags(this.#globalOpts, opts);
    if (!_doSampling(sample)) return;
    const data = metricFormats.buildCountBody(key, num, sample, tags);
    this.#client.queueData(data);
  }

  /**
   * Sends a "timing" metric, typically measured in milliseconds. The remote StatsD server will usually calculate other
   * metrics based on these values. These metrics can include things like: min, max, average, mean90, etc...
   * 
   * While this metric type was originally intended only for timing measurements, it can really be used for any value
   * where things like min, max, mean90, etc... would be useful.
   * 
   * @example
   *   // Keep track of route response times:
   *   client.timing("routes.get_api_resource.ok", Date.now() - start);
   * 
   * @param key Metric key
   * @param ms  Measurement
   * @param opts Extra options
   */
  timing(key: string, ms: number, opts?: MetricOpts) {
    const sample = _getSampling(
      this.#globalOpts,
      opts,
      true,
      this.#safeSampleRate,
    );
    const tags = _getTags(this.#globalOpts, opts);
    if (!_doSampling(sample)) return;
    const data = metricFormats.buildTimingBody(key, ms, sample, tags);
    this.#client.queueData(data);
  }

  /**
   * Sends a "gauge" metric. Gauges are point-in-time measurements, that are true, at this time. The StatsD server will
   * keep gauges in memory, and will keep using them if a new value wasn't sent. Use this to track values that are
   * absolutely true, at this point-in-time. This could include things like "number of items in a db table", or "bytes
   * remaining in the main disk partition." Things like that.
   * 
   * @example
   *   // Keep track of server disk usage:
   *   client.gauge(`servers.${await Deno.hostname()}.diskPercent`, await getDiskPercent());
   * 
   * @example
   *   // Keep track of items in a db table:
   *   client.gauge("database.main.users", await userTable.count());
   * 
   * @param key   Metric key
   * @param value Measurement
   * @param opts  Extra options
   */
  gauge(key: string, value: number, opts?: MetricOpts) {
    const sample = _getSampling(
      this.#globalOpts,
      opts,
      true,
      this.#safeSampleRate,
    );
    const tags = _getTags(this.#globalOpts, opts);
    if (!_doSampling(sample)) return;
    const data = metricFormats.buildAbsGaugeBody(key, value, sample, tags);
    this.#client.queueData(data);
  }

  /**
   * Sends a relative "gauge" metric. A _relative_ gauge metric may reference a gauge value (an absolute measurement)
   * but we aren't sending that exact measurement right now. We're just sending an adjustment value.
   * 
   * @example
   *   // Adjust the total asset size after an upload:
   *   client.adjustGauge("assets.size.overall", asset.byteLength);
   * 
   * @example
   *   // Adjust the total number of users after a cancellation:
   *   client.adjustGauge("users.count", -1);
   * 
   * @param key   Metric key
   * @param delta Adjustment value
   * @param opts  Extra options
   */
  adjustGauge(key: string, delta: number, opts?: MetricOpts) {
    const sample = _getSampling(
      this.#globalOpts,
      opts,
      false,
      this.#safeSampleRate,
    );
    const tags = _getTags(this.#globalOpts, opts);
    if (!_doSampling(sample)) return;
    const data = metricFormats.buildRelGaugeBody(key, delta, sample, tags);
    this.#client.queueData(data);
  }

  /**
   * Sends a "set" metric. A set metric tracks the number of distinct values seen in StatsD over time. Use this to track
   * things like the number of disctint users.
   * 
   * @example
   *   // Track distinct authenticated users
   *   client.unique("users.distinct", user.id);
   * 
   * @param key   Metric key
   * @param value Identifying value
   * @param opts  Extra options
   */
  unique(key: string, value: number, opts?: MetricOpts) {
    const sample = _getSampling(
      this.#globalOpts,
      opts,
      false,
      this.#safeSampleRate,
    );
    const tags = _getTags(this.#globalOpts, opts);
    if (!_doSampling(sample)) return;
    const data = metricFormats.buildSetBody(key, value, sample, tags);
    this.#client.queueData(data);
  }
}

// Get the effective sampling rate for this metric:
function _getSampling(
  globalOpts: Required<MetricOpts>,
  metricOpts: MetricOpts | undefined,
  isSafe: boolean,
  forceSafe: boolean,
) {
  // If this is a non-safe metric in safe mode, always send:
  if (!isSafe && forceSafe) return 1.0;
  return metricOpts?.sampleRate ?? globalOpts.sampleRate;
}

// Get the full tag set for this metric:
function _getTags(
  globalOpts: Required<MetricOpts>,
  metricOpts: MetricOpts | undefined,
): Tags {
  return {
    ...globalOpts.tags,
    ...metricOpts?.tags,
  };
}

// Return true if we should send this metric, based on the sampling rates, and the metric in question:
function _doSampling(rate: number): boolean {
  return (rate >= 1 || Math.random() < rate);
}

function _connect(info: LibConfig["server"], maxDelay: number): Client {
  const proto = info?.proto || null;
  switch (proto) {
    case null:
    case "udp": {
      const host = info?.host ?? "localhost";
      const port = info?.port ?? 8125;
      const mtu = info?.mtu ?? 1500;
      return new UDPClient(host, port, mtu, maxDelay);
    }
  }
}
