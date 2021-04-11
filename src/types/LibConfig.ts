import { Tags } from "./Tags.ts";

export interface LibConfig {
  /**
   * How to connect to a Server. If omitted, we'll try to connect to a UDP server on localhost:8125.
   */
  server?: UDPConfig | TCPConfig | UnixConfig | LoggerConfig;

  /**
   * There are many different statistic products out there, that all speak the StatsD protocol, or at least some variant
   * of it. This property allows us to select different StatD dialects, which could unlock some new features, and may
   * also change some subtle features behind-the-scenes to work better with this server. (Like how tags get normalized,
   * for example.)
   * 
   * Valid dialects:
   * - `"statsd"`: The official StatsD server, written by Etsy with Node.js.
   * - `"datadog"`: The version of StatsD supported by DogStatD, the Datadog stat server.
   * 
   * @default "statsd"
   */
  dialect?: "statsd" | "datadog";

  /**
   * The sampling rate we'll use for metrics. This should be a value between 0 and 1, inclusive.
   * 
   * For example, if this value is set to 0.1, then 1 out of 10 calls to .count() will actually result in a counter
   * being sent to the server. HOWEVER, the server will then increase the counter by 10x the amount it normally would
   * have been increased. This will result in less data being sent over the wire, but with mostly the same ending
   * values. (Albeit with a bit more error.)
   * 
   * @default 1.0 (Don't use random sampling)
   */
  sampleRate?: number;

  /**
   * StatsD occasionally has some erratic behaviors when dealing with sampleRates. For example, relative gauges don't
   * have any sampleRate corrections on the server-side, and so would result in the wrong number of adjustments being
   * made to the data. Same with sets: the wrong number of unique values will be reported if sampleRates are used.
   * 
   * This setting, when true, will cause us to ignore the sampleRate in metrics that wouldn't handle it well. (Relative
   * gauges, and Sets.)
   * 
   * @default true (Only use sampleRate when safe)
   */
  safeSampleRate?: boolean;

  /**
   * When we get a metric to send, we'll wait (at most) this number of milliseconds before actually sending it. This
   * gives us some time for other metrics to be queued up, so we can send them all at once, in the same packet. We may
   * decide to send the packet sooner (like if it gets too big for the MTU) but in general, this is the maximum amount
   * of time that your metric will be delayed.
   * 
   * @default 1000 (1 second)
   */
  maxDelayMs?: number;

  /**
   * Tags are key-value pairs that are appended to each metric.
   * 
   * @default {}
   */
  globalTags?: Tags;
}

/**
 * Information needed to connect to a UDP StatsD server.
 */
export interface UDPConfig {
  proto: "udp";

  /**
   * The server that we'll send our stats to.
   * 
   * @default "localhost"
   */
  host?: string;

  /**
   * The server port number that we'll connect to.
   * 
   * @default 8125
   */
  port?: number;

  /**
   * The Maximum Transmission Unit for the network connection.
   * 
   * We use this number when figuring out the maximum amount of data that we can send in a single network packet. A
   * smaller number means more packets will have to be sent, but if we set this value _TOO_ high, it might mean that
   * packets won't arrive.
   * 
   * 1500 bytes is usually safe enough for most server networks. Fancy networks that have Jumbo Frames enabled might be
   * able to bump this value higher, like to 8932 bytes, but worse networks (like if these packets are routed through
   * the wider internet) might need to reduce the MTU to 512. It all depends on the routers that these packets get
   * routed through, and how they were configured.
   * 
   * @default 1500 (Enough bytes for most server networks)
   */
  mtu?: number;
}

/**
 * Information needed to connect to a TCP StatsD server.
 */
export interface TCPConfig {
  proto: "tcp";

  /**
   * The server that we'll send our stats to.
   * 
   * @default "localhost"
   */
  host?: string;

  /**
   * The server port number that we'll connect to.
   * 
   * @default 8125
   */
  port?: number;

  /**
   * Sent metrics are queued up for a short bit (see: maxDelayMs) before sending, to increase the number of metrics in
   * each TCP frame. However, if the backlog exceeds this number of items, we'll send the items sooner.
   * 
   * @default 100
   */
  maxQueue?: number;
}

/**
 * Information needed to connect to a UDS (Unix Domain Socket) StatsD server.
 */
export interface UnixConfig {
  proto: "unix";

  /**
   * The path to the socket file.
   */
  path: string;

  /**
   * Sent metrics are queued up for a short bit (see: maxDelayMs) before sending, to decrease the number of filesystem
   * writes. However, if the backlog exceeds this number of items, we'll send the items sooner.
   * 
   * @default 100
   */
  maxQueue?: number;
}

/**
 * If the server is set to a "logger" proto, then we'll only log metrics to the standard logger at INFO levels. Useful
 * for debugging, and if you don't want to actually send anything over the network.
 */
export interface LoggerConfig {
  proto: "logger";
}
