# Version history

## v0.5.0 (2021-05-06)

- Allow custom loggers to be injected. Stop relying on std.

## v0.4.1 (2021-04-13)

- Bump std to 0.93.0.
- Fix a minor type issue that cropped up with Deno 1.9.0.

## v0.4.0 (2021-04-11)

- Can now select a "dialect" of the StatsD service. (Currently, "statsd" or
  "datadog".)
- Added datadog-specific metrics and validation.
- Added datadog events.
- Added datadog service checks.
- Added a new "logger" server config for debugging.

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
