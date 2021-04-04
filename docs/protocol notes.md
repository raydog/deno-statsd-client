# StatsD Protocol

I wan't able to find a GREAT protocol doc, at least, not one that documented ALL of the features. So this is what I could glean from the packet-parsing code in the reference server implementation:


## Reference Server Notes

- Packet data is split on `\n` to extract multiple metrics, so it's the most important token.
- After that, `|#` is split on. Anything in index 1 is used as tags, split on `,`.
- The data in index 0 (either the stuff to the left of `|#` **OR** the whole data region, if there was no `|#`) is then split on `:`. Key is anything to the left of that `:`.
- If there are tags, key has `;` appended to it, plus all the tags, which are mangled by:
    - Any `;` becomes `_`.
    - Any `:` becomes `=`.
    - All tags then joined with `;`
- After this mangling, the key name (which by now could have tags appended to it, like: `;key1=val;key2=val`) is sanitized. The sanitization is optional, and seems to be mostly for the sake of the Graphite backend, so not part of the protocol...
- If there are no remaining bits (ie: `:` wasn't in the string, and so the full data region was inferred to be the key) then the literal `"1"` is pushed into the remaining stuff.
- For each remaining bit (so for each string that separated by `:`, or that inferred `1`):
    - Split on `|`, store as "fields".
    - If `fields[1]` is undefined, is_valid_packet is false, so it seems that the inferred `1` value actually would fail validation.
    - `fields[2]` is checked to be a sample-rate.
    - `fields[1]` is checked based on a type enum, and `fields[0]` is validated based on that:
        - `s` will accept ANY `fields[0]` value.
        - `g` asserts `fields[0]` is a number.
        - `ms` asserts `fields[0]` is a number >= 0.
        - Else (!?!?), just make sure it's a number.
    - After validation, `fields[2]` is used as the sampleRate. The value `1` is inferred if it was missing.
    - `fields[1]` is then used as the metric type. The parsing code trims it, but it was already validated without the trim, so that does nothing.
        - `ms` (timing) type will push the timing val, plus a counter equal to `1/sampleRate`
        - `g` (guage) will update the gauge value based on `fields[0]`. If the number started with a `+` or `-`, then the prior value will be mutated by that relative adjustment. Else, the value will just be replaced.
        - `s` (set) will push `fields[0]` into a Set for the given key. If no `fields[0]` is present, `"0"` is inferred.
        - Else, This is treated as a `c`. Counter value is increased / decreased by `fields[0]` (or 1 if absent) times `1/sampleRate`.


## Protocol EBNF

This is the protocol, as far as I can tell, at least. The raw parser accepts data beyond what is described. For example, tag keys / values would technically accept any char, according to the code. However, a tag key with "|#" in it would result in tags being thrown away.

Minor notes:

- The parser accepts packets without metrics regions (it defaults to the literal "1" in that case.) However, "1" then fails validation, so I'll just say that you need at least 1 metric, despite the INTENT of this code.
- The parser allows duplicate `\n` chars that produce Datum regions with zero-length (it would then ignore them) but I'll just say that we ~~can't~~ shouldn't do that.
- Relative gauges aren't safe to use a sample-rate, but the parser allows it, and so I will.
- Absolute gauges can't assign to negative measurements. That's... just not allowed by this parser?
- Tags with `;` in them are mangled to have `_` instead. This is interpretted to be a feature, so I'll allow it.

Clients that only sent data in this subset would _probably_ be "safe":


```ebnf
Packet = Datum, { "\n", Datum };
Datum = Key, ":", Metrics, [ "|#" Tags ];

Key = String;

(* Metrics Rules *)
Metrics = Metric-Row, { ":", Metric-Row };
Metric-Row = Metric, [ Sample-Rate ];

Metric = Metric-Timing | Metric-Gauge-Rel | Metric-Gauge-Abs |
         Metric-Set | Metric-Count;

Metric-Timing = Float-Pos, "|ms";
Metric-Gauge-Rel = Sign, Float-Pos, "|g";
Metric-Gauge-Abs = Float-Pos, "|g";
Metric-Set = [ String ], "|s";
Metric-Count = [ Sign ], Float-Pos, "|c";

Sample-Rate = "|@", Float-Sample;

(* Tag Rules *)
Tags = Tag, { ",", Tag };
Tag = Tag-Key, ":", Tag-Val;
Tag-Key = String;
Tag-Val = String;

(* Terminals *)
String = ? UTF-8 string without '|', '#', ':', '\n', or ';' ?;
Sign = "+" | "-";
Float-Pos = ? Floating-point number >= 0 (so no - or + prefix) ?;
Float-Sample = ? Floating-point number between 0 and 1, inclusive ?;
```
