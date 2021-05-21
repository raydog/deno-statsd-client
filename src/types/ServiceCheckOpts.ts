import { Tags } from "./Tags.ts";

/**
 * Service-check options. Used when doing service-checks for datadog.
 */
export interface ServiceCheckOpts {
  /**
   * Name of the service check
   */
  name: string;

  /**
   * Service check status.
   */
  status: "ok" | "warning" | "critical" | "unknown";

  /**
   * Timestamp for the service check.
   *
   * Default is "now", so only supply this if submitting a service check retroactively.
   */
  time?: Date;

  /**
   * The hostname for this service check.
   *
   * If omitted, we'll use `Deno.hostname()` if the current process has environment permissions. Else the param will not
   * be sent with the event. If you wish to omit hostname from the event, use the value `false`.
   *
   * @example "api-server-42"
   */
  host?: string;

  /**
   * Tags for this service check.
   */
  tags?: Tags;

  /**
   * A message describing the current status.
   */
  message?: string;
}

export interface InternalServiceCheckOpts {
  name: string;
  status: "ok" | "warning" | "critical" | "unknown";
  time: Date;
  host: string;
  tags: Tags;
  message: string;
}
