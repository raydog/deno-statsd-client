/**
 * StatsD client library
 *
 * @license MIT
 * @module
 */

export type {
  LibConfig,
  LoggerConfig,
  TCPConfig,
  UDPConfig,
  UnixConfig,
} from "./src/types/LibConfig.ts";
export type { MetricOpts } from "./src/types/MetricOpts.ts";
export type { EventOpts } from "./src/types/EventOpts.ts";
export type { ServiceCheckOpts } from "./src/types/ServiceCheckOpts.ts";
export type { Tags } from "./src/types/Tags.ts";
export type { Logger } from "./src/types/Logger.ts";

export { StatsDClient } from "./src/StatsDClient.ts";
