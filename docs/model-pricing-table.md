# Model pricing table

System Settings → Model pricing presents one row per model with input, output,
cache-read, and cache-write prices in USD per million tokens. The numeric columns
can be sorted and hidden independently. Select a row or its Edit action to open
the pricing editor on desktop or mobile.

The four common token prices are shown first. Image and audio prices remain under
Advanced pricing. Per-request pricing and expression pricing have separate modes;
their rows do not claim a fixed token rate. Expressions continue to support
cache-write durations, context tiers, and request-dependent rates.

## Compatibility

This is a unified management view over the existing pricing settings, not a new
database table or billing mode. Existing options, built-in price definitions,
group multipliers, billing calculations, and API clients remain compatible. No
automatic data migration is performed.

For legacy token pricing, input USD/1M is `ModelRatio * 2`. Output, cache-read, and
cache-write USD/1M are input price multiplied by their effective ratios. Absent
cache-read and cache-write overrides resolve to `1` and `1.25` respectively.
An absent rate is never presented as a free rate; explicit zero remains zero.

`CompletionRatioMeta` reports the effective output multiplier, whether it is
enforced by the backend, and `default_ratio`, the fallback after removing an
editable override. Enforced output rates are read-only in the simple editor;
use expression pricing to specify an independent output rate. Similarly, use
expression pricing for free input with nonzero output or cache prices, which
cannot be represented by legacy input-relative ratios.

Opening the editor does not write settings. Valid edits are retained as a local
draft when the drawer closes; Save model prices persists through the existing
settings workflow. Closing an invalid or unnamed draft discards those edits.
