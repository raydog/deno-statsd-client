import { Client } from "./types/Client.ts";
import { UDPClient } from "./network/UDPClient.ts";
import { SocketClient } from "./network/SocketClient.ts";
import {
  LibConfig,
  TCPConfig,
  UDPConfig,
  UnixConfig,
} from "./types/LibConfig.ts";
import { MetricOpts } from "./types/MetricOpts.ts";
import * as formats from "./utils/formats.ts";
import { StatsDError } from "./StatsDError.ts";
import { Dialect } from "./types/Dialect.ts";
import { StatsDDialect } from "./dialects/StatsDDialect.ts";
import { DatadogDialect } from "./dialects/DatadogDialect.ts";
import { EventOpts, InternalEventOpts } from "./types/EventOpts.ts";
import { LoggerClient } from "./network/LoggerClient.ts";
import {
  InternalServiceCheckOpts,
  ServiceCheckOpts,
} from "./types/ServiceCheckOpts.ts";

type Tags = { [key: string]: string };

/**
 * StatsD client. Use this to send data to a StatsD-speaking backend.
 */
export class StatsDClient {
  #client: Client | null;

  #globalOpts: Required<MetricOpts>;
  #safeSampleRate: boolean;

  #dialect: Dialect;
  #cachedHostname: string | undefined;

  // Returns the client. Used to implement a shutdown state:
  private getClient(): Client {
    if (!this.#client) {
      throw new StatsDError("Client is closed");
    }
    return this.#client;
  }

  // Fetch the current hostname. Cache the result.
  // If permissions haven't been granted, we'll cache "".
  private getHostname(): string {
    if (this.#cachedHostname !== undefined) return this.#cachedHostname;

    try {
      this.#cachedHostname = Deno.hostname();
      return this.#cachedHostname;
    } catch (ex) {
      if (ex instanceof Deno.errors.PermissionDenied) {
        this.#cachedHostname = "";
        return this.#cachedHostname;
      }
      throw ex;
    }
  }

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
    this.#dialect = _getDialect(conf);
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
    const client = this.getClient();
    const sample = _getSampling(
      this.#globalOpts,
      opts,
      true,
      this.#safeSampleRate,
    );
    const tags = _getTags(this.#globalOpts, opts);
    if (!_doSampling(sample)) return;
    const data = formats.buildCountBody(
      this.#dialect,
      key,
      num,
      sample,
      tags,
    );
    client.queueData(data);
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
    const client = this.getClient();
    const sample = _getSampling(
      this.#globalOpts,
      opts,
      true,
      this.#safeSampleRate,
    );
    const tags = _getTags(this.#globalOpts, opts);
    if (!_doSampling(sample)) return;
    const data = formats.buildTimingBody(
      this.#dialect,
      key,
      ms,
      sample,
      tags,
    );
    client.queueData(data);
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
    const client = this.getClient();
    const sample = _getSampling(
      this.#globalOpts,
      opts,
      true,
      this.#safeSampleRate,
    );
    const tags = _getTags(this.#globalOpts, opts);
    if (!_doSampling(sample)) return;
    const data = formats.buildAbsGaugeBody(
      this.#dialect,
      key,
      value,
      sample,
      tags,
    );
    client.queueData(data);
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
    const client = this.getClient();
    const sample = _getSampling(
      this.#globalOpts,
      opts,
      false,
      this.#safeSampleRate,
    );
    const tags = _getTags(this.#globalOpts, opts);
    if (!_doSampling(sample)) return;
    const data = formats.buildRelGaugeBody(
      this.#dialect,
      key,
      delta,
      sample,
      tags,
    );
    client.queueData(data);
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
  unique(key: string, value: number | string, opts?: MetricOpts) {
    const client = this.getClient();
    const sample = _getSampling(
      this.#globalOpts,
      opts,
      false,
      this.#safeSampleRate,
    );
    const tags = _getTags(this.#globalOpts, opts);
    if (!_doSampling(sample)) return;
    const data = formats.buildSetBody(
      this.#dialect,
      key,
      value,
      sample,
      tags,
    );
    client.queueData(data);
  }

  /**
   * Sends a "histogram" metric. A histogram is pretty much the same thing as a timer, but created by datadog, and not
   * compatible with StatsD.
   * 
   * I don't get it either.
   * 
   * This extension to the StatsD protocol is only available when the Dialect is "datadog". Normal StatsD setups should
   * just use the timer metric.
   * 
   * @see Docs https://docs.datadoghq.com/developers/metrics/dogstatsd_metrics_submission/#histogram
   * @deprecated
   * 
   * @param key   Metric key
   * @param value Timing value
   * @param opts  Extra options
   */
  histogram(key: string, value: number, opts?: MetricOpts) {
    const client = this.getClient();
    const sample = _getSampling(
      this.#globalOpts,
      opts,
      true,
      this.#safeSampleRate,
    );
    const tags = _getTags(this.#globalOpts, opts);
    if (!_doSampling(sample)) return;
    const data = formats.buildHistogramBody(
      this.#dialect,
      key,
      value,
      sample,
      tags,
    );
    client.queueData(data);
  }

  /**
   * Sends a "distribution" metric. A distribution seems to be functionally equivalent to a timing metric, but has its
   * own page in datadog that has been deprecated.
   * 
   * This extension to the StatsD protocol is only available when the Dialect is "datadog". Normal StatsD setups should
   * just use the timer metric.
   * 
   * @see Docs https://docs.datadoghq.com/developers/metrics/dogstatsd_metrics_submission/#distribution
   * @deprecated
   * 
   * @param key   Metric key
   * @param value Timing value
   * @param opts  Extra options
   */
  distribution(key: string, value: number, opts?: MetricOpts) {
    const client = this.getClient();
    const sample = _getSampling(
      this.#globalOpts,
      opts,
      true,
      this.#safeSampleRate,
    );
    const tags = _getTags(this.#globalOpts, opts);
    if (!_doSampling(sample)) return;
    const data = formats.buildDistributionBody(
      this.#dialect,
      key,
      value,
      sample,
      tags,
    );
    client.queueData(data);
  }

  event(event: EventOpts) {
    const client = this.getClient();
    const host = (typeof event.host === "string")
      ? event.host
      : (event.host === false)
      ? ""
      : this.getHostname();
    const ev: InternalEventOpts = {
      title: event.title,
      text: event.text,
      time: event.time ?? new Date(),
      host,
      aggregate: event.aggregate,
      priority: event.priority ?? "normal",
      source: event.source,
      type: event.type ?? "info",
      tags: _getTags(this.#globalOpts, event),
    };
    const data = formats.buildEventBody(this.#dialect, ev);
    client.queueData(data);
  }

  serviceCheck(check: ServiceCheckOpts) {
    const client = this.getClient();
    const host = (typeof check.host === "string")
      ? check.host
      : (check.host === false)
      ? ""
      : this.getHostname();
    const opts: InternalServiceCheckOpts = {
      name: check.name,
      status: check.status,
      time: check.time ?? new Date(),
      host,
      tags: _getTags(this.#globalOpts, check),
      message: check.message ?? "",
    };
    const data = formats.buildServiceCheckBody(this.#dialect, opts);
    client.queueData(data);
  }

  /**
   * Will flush all pending metrics, and close all open sockets.
   * 
   * Any attempts to use this client after close() should error.
   */
  async close(): Promise<void> {
    const client = this.getClient();
    this.#client = null;
    await client.close();
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
  } as Tags;
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
      const udp = info as UDPConfig;
      const host = udp?.host ?? "localhost";
      const port = udp?.port ?? 8125;
      const mtu = udp?.mtu ?? 1500;
      return new UDPClient({ host, port, mtu, maxDelay });
    }

    case "tcp": {
      const tcp = info as TCPConfig;
      const host = tcp.host ?? "localhost";
      const port = tcp.port ?? 8125;
      const maxQueue = tcp.maxQueue ?? 100;
      return new SocketClient({ mode: "tcp", host, port, maxQueue, maxDelay });
    }

    case "unix": {
      const tcp = info as UnixConfig;
      const path = tcp.path;
      const maxQueue = tcp.maxQueue ?? 100;
      return new SocketClient({ mode: "unix", path, maxQueue, maxDelay });
    }

    case "logger":
      return new LoggerClient();
  }
}

function _getDialect(config: LibConfig | undefined) {
  switch (config?.dialect) {
    case undefined:
    case "statsd": {
      const proto = config?.server?.proto ?? "udp";
      return new StatsDDialect(proto === "udp");
    }

    case "datadog":
      return new DatadogDialect();
  }
}
