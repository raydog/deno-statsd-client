# Version history

## v0.4.0 (2021-04-11)

- Added a new "logging" server for debugging.
- Can now select a "dialect" of the StatsD service. (Currently, "statsd" or
  "datadog".)
- Added datadog-specific metrics.
- Added datadog events.
- Added datadog service checks.

## v0.3.0 (2021-04-07)

- Add UDP (Unix Domain Socket) support.

## v0.2.0 (2021-04-06)

- Add support for TCP connections
- Can now enabling logging by configuring the `statsd` logger in the std logging
  library.

## v0.1.1 (2021-04-04)

- Minor type and doc fixes

## v0.1.0 (2021-04-04)

- Initial version
- Supports UDP connections
- Supports all official StatsD metrics (count, gague, timing, set)
