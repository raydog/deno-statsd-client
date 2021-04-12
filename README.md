# deno-statsd-client

A simple StatsD client for Deno.

Supports the official stat metrics (counts, timings, gauges, sets), a few
datadog extensions (histogram, distribution, events, service checks) as well as
both TCP, UDP, and unix domain socket connections.

**Deno command-line args**:

You'll need certain flags to use this library, either to enable certain
permsissions, or to enable unstable APIs:

| If connecting via:  | You'll need:                                |
| ------------------- | ------------------------------------------- |
| UDP Datagrams       | `--unstable` `--allow-net`                  |
| TCP Packets         | `--unstable` `--allow-net`                  |
| Unix Domain Sockets | `--unstable` `--allow-read` `--allow-write` |

```ts
import { StatsDClient } from "https://deno.land/x/statsd@0.3.0/mod.ts";

const client = new StatsDClient({
  server: {
    proto: "udp",
    host: "localhost",
    port: 8125,
  },
});

// Count an event:
client.count("http.routes.get_resource");

// Track how long something took:
client.timing("http.routes.get_resource.200", responseTime);

// Track some interesting global measurement:
client.gauge(`server.${Deno.hostname()}.disk_left`, await getDiskRemaining());

// Adjust some other global measurement:
client.adjustGauge("assets.total_bytes_stored", new_upload.byteLength);

// Keep track of how many distinct things we've seen:
client.unique("users.unique", user.id);
```

## Constructor options:

- `server` (Object?) Object that describes how to connect to the server.

  If connecting via UDP datagrams:

  - `proto`: `"udp"`
  - `host` (string?) (Default: "localhost")
  - `port` (number?) (Default: 8125)
  - `mtu` (number?) (Default: 1500)

    The Maximum Transmission Unit for the network connection.

    We use this number when figuring out the maximum amount of data that we can
    send in a single network packet. A smaller number means more packets will
    have to be sent, but if we set this value _TOO_ high, it might mean that
    packets won't arrive.

    1500 bytes is usually safe enough for most server networks. Fancy networks
    that have Jumbo Frames enabled might be able to bump this value higher, like
    to 8932 bytes, but worse networks (like if these packets are routed through
    the wider internet) might need to reduce the MTU to 512 or less. It all
    depends on the routers that these packets get routed through, and how they
    were configured.

  If connecting via a TCP socket:

  - `proto`: `"tcp"`
  - `host` (string?) (Default: "localhost")
  - `port` (number?) (Default: 8125)
  - `maxQueue` (number?) (Default: 100)

    Sent metrics are queued up for a short bit (see: maxDelayMs) before sending
    to increase the number of metrics in each TCP frame. However, if the backlog
    exceeds this number of metrics, we'll send the items sooner.

  If connecting via a Unix domain socket:

  - `proto`: `"unix"`
  - `path` (string)
  - `maxQueue` (number?) (Default: 100)

    Sent metrics are queued up for a short bit (see: maxDelayMs) before sending,
    to decrease the number of filesystem writes. However, if the backlog exceeds
    this number of items, we'll send the items sooner.

  If you don't _actually_ want to connect, but instead just log every metric:

  - `proto`: `"logger"`

- `sampleRate` (number?) (Default: 1.0)

  The sampling rate we'll use for metrics. This should be a value between 0 and
  1, inclusive.

  For example, if this value is set to 0.1, then 1 out of 10 calls to .count()
  will actually result in a counter being sent to the server. HOWEVER, the
  server will then increase the counter by 10x the amount it normally would have
  been increased. This will result in less data being sent over the wire, but
  with mostly the same ending values. (Albeit with a bit more error.)

- `safeSampleRate` (boolean?) (Default: true)

  StatsD occasionally has some erratic behaviors when dealing with sampleRates.
  For example, relative gauges don't have any sampleRate corrections on the
  server-side, and so would result in the wrong number of adjustments being made
  to the data. Same with sets: the wrong number of unique values will be
  reported if sampleRates are used.

  This setting, when true, will cause us to ignore the sampleRate in metrics
  that wouldn't handle it well. (Relative gauges, and Sets.)

- `maxDelayMs` (number?) (Default: 1000)

  When we get a metric to send, we'll wait (at most) this number of milliseconds
  before actually sending it. This gives us some time for other metrics to be
  queued up, so we can send them all at once, in the same packet. We may decide
  to send the packet sooner (like if it gets too big for the MTU) but in
  general, this is the maximum amount of time that your metric will be delayed.

- `globalTags`: (Object?) (Default: `{}`)

  Tags are key-value pairs that are appended to each metric. Values need to be
  strings. If a value is the empty string, that tag will be skipped.

## Client Methods

- `count(key: string, num, opts?: MetricOpts)`

  Send a "count" metric. This is used to track the number of things.

  ```ts
  // Count the number of times a route was used:
  client.count("routes.get_api_resource");

  // Count the number of items purchased:
  client.count("store.widgets.purchased", order.items.length);
  ```

- `timing(key: string, ms: number, opts?: MetricOpts)`

  Sends a "timing" metric, typically measured in milliseconds. The remote StatsD
  server will usually calculate other metrics based on these values. These
  metrics can include things like: min, max, average, mean90, etc...

  While this metric type was originally intended only for timing measurements,
  it can really be used for any value where things like min, max, mean90, etc...
  would be useful.

  ```ts
  // Keep track of route response times:
  client.timing("routes.get_api_resource.ok", Date.now() - start);
  ```

- `gauge(key: string, value: number, opts?: MetricOpts)`

  Sends a "gauge" metric. Gauges are point-in-time measurements, that are true,
  at this time. The StatsD server will keep gauges in memory, and will keep
  using them if a new value wasn't sent. Use this to track values that are
  absolutely true, at this point-in-time. This could include things like "number
  of items in a db table", or "bytes remaining in the main disk partition."
  Things like that.

  ```ts
  // Keep track of server disk usage:
  client.gauge(
    `servers.${await Deno.hostname()}.diskPercent`,
    await getDiskPercent(),
  );

  // Keep track of items in a db table:
  client.gauge("database.main.users", await userTable.count());
  ```

- `adjustGauge(key: string, delta: number, opts?: MetricOpts)` Sends a relative
  "gauge" metric. A _relative_ gauge metric may reference a gauge value (an
  absolute measurement) but we aren't sending that exact measurement right now.
  We're just sending an adjustment value.

  ```ts
  // Adjust the total asset size after an upload:
  client.adjustGauge("assets.size.overall", asset.byteLength);

  // Adjust the total number of users after a cancellation:
  client.adjustGauge("users.count", -1);
  ```

- `unique(key: string, value: number | string, opts?: MetricOpts)`

  Sends a "set" metric. A set metric tracks the number of distinct values seen
  in StatsD over time. Use this to track things like the number of disctint
  users.

  ```ts
  // Track distinct authenticated users
  client.unique("users.distinct", user.id);
  ```

- `histogram(key: string, value: number, opts?: MetricOpts)`

  (Datadog-only)

  Sends a "histogram" metric. A histogram is pretty much the same thing as a
  timer, but created by datadog, and not compatible with StatsD.

  I don't get it either.

- `distribution(key: string, value: number, opts?: MetricOpts)`

  (Datadog-only)

  Sends a "distribution" metric. A distribution seems to be functionally
  equivalent to a timing metric, but has its own page in datadog that has been
  deprecated.

- `event(event: EventOpts)`

  (Datadog-only)

  Sends an "event" to datadog.

  ```ts
  // Send an exception to datadog:
  client.event({
    title: "Unexpected Error",
    text: err.stack || "",
    aggregate: "Errors",
    source: "database",
    type: "error",
  });
  ```

  This method only takes a single argument with these properties:

  - `title` (string)

    Title of the event.

  - `text` (string)

    Event text.

  - `time` (Date?) (Default: `new Date()`)

    Timestamp for the event.

    If omitted, we'll use the current time, so only send this if you're
    submitting an event retroactively.

  - `host` (string | false) (Default: `Deno.hostname()`)

    The hostname for the event.

    If omitted, we'll use `Deno.hostname()` if the current process has
    environment permissions. Else the param will not be sent with the event. If
    you wish to omit hostname from the event, use the value `false`.

  - `aggregate` (string?)

    An aggregation key for the event. Similar events will be grouped in datadog
    by this key.

  - `priority`: ("normal" | "low") (Default: "normal")

    A priority level for this event.

  - `source`: (string?)

    A source name for this event.

  - `type`: ("error" | "warning" | "info" | "success")

    An alert type for this event.

  - `tags`: (Object?)

    Tags that will be attached to this event.

- `serviceCheck(check: ServiceCheckOpts)`

  (Datadog-only)

  Sends a "service check" to datadog.

  ```ts
  // Send a critical redis outage to datadog.
  client.serviceCheck({
    name: "Redis connection",
    status: "critical",
    tags: { env: "production" },
    message: "Redis connection timed out after 10s",
  });
  ```

  This method only takes a single argument with these properties:

  - `name` (string)

    Name of the service check

  - `status`: ("ok" | "warning" | "critical" | "unknown")

    Service check status.

  - `time` (Date?) (Default: `new Date()`)

    Timestamp for the service check.

    Default is "now", so only supply this if submitting a service check
    retroactively.

  - `host` (string | false) (Default: `Deno.hostname()`)

    The hostname for this service check.

    If omitted, we'll use `Deno.hostname()` if the current process has
    environment permissions. Else the param will not be sent with the event. If
    you wish to omit hostname from the event, use the value `false`.

  - `tags`: (Object?)

    Tags for this service check.

  - `message`: (string?)

    A message describing the current status.

- `async close(): Promise<void>`

  Will flush all pending metrics, and close all open sockets.

  Any attempts to use this client after close() should error.

### MetricOpts

Some params can be overridden for each metric with the MetricOpts object.

- `sampleRate` - To use a custom sampleRate for this metric.
- `tags` - To add some extra tags to this metric. (They are merged with the
  global tags)

### Logging

This library uses the std library's logger for its own internal logging. If
those logs would be useful for debugging, then the `statsd` logger can be
configured like so:

```ts
import * as log from "https://deno.land/std@0.92.0/log/mod.ts";

await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler("DEBUG"),
  },
  loggers: {
    statsd: {
      level: "INFO",
      handlers: ["console"],
    },
  },
});
```

Be sure to do this BEFORE initializing the `StatsDClient`.
