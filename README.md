# deno-statsd-client

A simple StatsD client for Deno.

Since Deno's UDP stuff is still unstable, you'll need to use `--unstable` to use
a UDP server. Also, you'll need to enable network access with `--allow-net`.

```typescript
import { StatsDClient } from "https://deno.land/x/statsd@0.1.1/mod.ts";

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

- `server` (Object?) Object that describes what to connect to.

  If connecting to a UDP server, then object should have:

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

    ```typescript
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

    ```typescript
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

    ```typescript
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

    ```typescript
    // Adjust the total asset size after an upload:
    client.adjustGauge("assets.size.overall", asset.byteLength);

    // Adjust the total number of users after a cancellation:
    client.adjustGauge("users.count", -1);
    ```

- `unique(key: string, value: number | string, opts?: MetricOpts)`

  Sends a "set" metric. A set metric tracks the number of distinct values seen
  in StatsD over time. Use this to track things like the number of disctint
  users.

    ```typescript
    // Track distinct authenticated users
    client.unique("users.distinct", user.id);
    ```

- `async close(): Promise<void>`

  Will flush all pending metrics, and close all open sockets.

  Any attempts to use this client after close() should error.

### MetricOpts

Some params can be overridden for each metric with the MetricOpts object.

- `sampleRate` - To use a custom sampleRate for this metric.
- `tags` - To add some extra tags to this metric. (They are merged with the
  global tags)
