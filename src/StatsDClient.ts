import { Client } from "./types/Client.ts";
import { UDPClient } from "./network/UDPClient.ts";
import { LibConfig } from "./types/LibConfig.ts";
import { StatsDError } from "./StatsDError.ts";
import { MetricOpts } from "./types/MetricOpts.ts";
import * as metricFormats from "./metricFormats.ts";

type Tags = { [key: string]: string };

export class StatsDClient {
  #client: Client;
  #mtu: number;
  #maxDelay: number;

  #timeout: number | null = null;
  #encoder: TextEncoder = new TextEncoder();
  #buffer: Uint8Array;
  #idx = 0;

  #rate: number;
  #tags: Tags;

  // Proto note:
  // key:num|type (@sample)
  // So foo.bar:22|ms@0.1
  // UTF-8 keys.

  constructor(conf?: LibConfig) {
    this.#client = _connect(conf?.server);
    this.#mtu = conf?.mtu ?? 1500;
    this.#maxDelay = conf?.maxDelayMs ?? 1000;
    this.#buffer = new Uint8Array(this.#mtu);
    this.#rate = conf?.sampling ?? 1.0;
    this.#tags = conf?.globalTags ?? {};
  }

  // Pushes a metric line to be written. Doesn't IMMEDIATELY write:
  private _queueData(data: string) {
    const pre = this.#idx ? "\n" : "";
    let enc = this.#encoder.encode(pre + data);
    const buflen = this.#buffer.byteLength;

    if (enc.byteLength > this.#buffer.byteLength) {
      throw new StatsDError(
        `Metric is too large for this MTU: ${enc.byteLength} > ${buflen}`,
      );
    }

    if (this.#idx + enc.byteLength > buflen) {
      this._flushData();
      enc = enc.subarray(1); // Don't need the \n anymore
    }

    this.#buffer.set(enc, this.#idx);
    this.#idx += enc.byteLength;

    // Set flush timeout.
    if (!this.#timeout) {
      // TODO: maxDelay == 0 is an immediate send?
      this.#timeout = setTimeout(
        () => this._flushData(),
        this.#maxDelay,
      );
    }
  }

  // Flush the metric buffer to the StatsD server:
  private _flushData() {
    if (this.#timeout != null) {
      clearTimeout(this.#timeout);
      this.#timeout = null;
    }
    if (this.#idx) {
      const region = this.#buffer.subarray(0, this.#idx);
      this.#buffer = new Uint8Array(this.#mtu);
      this.#idx = 0;
      this.#client.write(region)
        .catch(
          (err) => console.log("FAIL", err.message),
        );
    }
  }

  // c
  count(key: string, num = 1, opts?: MetricOpts) {
    const sample = _getSampling(this.#rate, opts?.sampling);
    const tags = _getTags(this.#tags, opts?.tags);
    if (sample < 1 && Math.random() < sample) {
      return;
    }
    const data = metricFormats.buildCountBody(key, num, sample, tags);
    this._queueData(data);
  }

  // ms
  timing(key: string, ms: number, opts?: MetricOpts) {
    const sample = _getSampling(this.#rate, opts?.sampling);
    const tags = _getTags(this.#tags, opts?.tags);
    if (sample < 1 && Math.random() < sample) {
      return;
    }
    const data = metricFormats.buildTimingBody(key, ms, sample, tags);
    this._queueData(data);
  }

  // g
  gauge(key: string, value: number, opts?: MetricOpts) {
    const sample = _getSampling(this.#rate, opts?.sampling);
    const tags = _getTags(this.#tags, opts?.tags);
    if (sample < 1 && Math.random() < sample) {
      return;
    }
    const data = metricFormats.buildAbsGaugeBody(key, value, sample, tags);
    this._queueData(data);
  }

  // g
  adjustGauge(key: string, delta: number, opts?: MetricOpts) {
    const sample = _getSampling(this.#rate, opts?.sampling);
    const tags = _getTags(this.#tags, opts?.tags);
    if (sample < 1 && Math.random() < sample) {
      return;
    }
    const data = metricFormats.buildRelGaugeBody(key, delta, sample, tags);
    this._queueData(data);
  }

  // h
  histogram(key: string, value: number) {
  }

  // s (set?)
  set(key: string, value: number) {
  }
}

function _getSampling(fallback: number, metric: number | undefined) {
  return metric ?? fallback;
}

function _getTags(globalTags: Tags, metricTags: Tags | undefined): Tags {
  return {
    ...globalTags,
    ...metricTags,
  };
}

function _connect(info: LibConfig["server"]): Client {
  const proto = info?.proto || null;
  switch (proto) {
    case null:
    case "udp": {
      const host = info?.host || "localhost";
      const port = info?.port || 8125;
      return new UDPClient(host, port);
    }
  }
}
