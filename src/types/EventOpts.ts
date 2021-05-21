import { Tags } from "./Tags.ts";

/**
 * Event parameters. Used when creating an Event for dogstatsd.
 */
export interface EventOpts {
  /**
   * Title of the event.
   *
   * @example "An exception occurred"
   */
  title: string;

  /**
   * Event text.
   *
   * @example "Cannot parse CSV file from xyz"
   */
  text: string;

  /**
   * Timestamp for the event.
   *
   * If omitted, we'll use the current time, so only send this if you're submitting an event retroactively.
   *
   * @example new Date("2020-01-02T03:04:05.678Z")
   */
  time?: Date;

  /**
   * The hostname for the event.
   *
   * If omitted, we'll use `Deno.hostname()` if the current process has environment permissions. Else the param will not
   * be sent with the event. If you wish to omit hostname from the event, use the value `false`.
   *
   * @example "api-server-42"
   */
  host?: string | false;

  /**
   * An aggregation key for the event.
   *
   * Similar events will be grouped in datadog by this key.
   *
   * @example "exception"
   */
  aggregate?: string;

  /**
   * A priority level for this event. Either "normal" or "low".
   */
  priority?: "normal" | "low";

  /**
   * A source type for this event.
   */
  source?: string;

  /**
   * An alert type for this event.
   */
  type?: "error" | "warning" | "info" | "success";

  /**
   * Tags that will be attached to this event.
   */
  tags?: Tags;
}

/**
 * Event parameters. Used internally. (Ie: default fields are populated)
 */
export interface InternalEventOpts {
  title: string;
  text: string;
  time: Date;
  host: string;
  aggregate?: string;
  priority: "normal" | "low";
  source?: string;
  type: "error" | "warning" | "info" | "success";
  tags: Tags;
}
