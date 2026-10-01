# Optional measurement comparison

Use `scripts/compare_measurements.py` when a project can export named reference targets and independently collected runtime observations. It supports the existing fidelity checks; it is optional and adds no acceptance gate. A match covers **supplied measurements only**, not the whole screen, interaction, accessibility, or approval.

## Collect comparable evidence

Freeze reference targets, context, and calibrated tolerances before implementation. Map each named measurement to the project's actual instrument (for example DOM geometry or native layout/paint APIs). Collect actual values from the installed/served build independently; never copy targets into observations. Keep layout, visible ink, and hit bounds separate, and choose an instrument that measures the claimed property.

Use one pair of files per equivalent state. Pin the same reference revision, fixture, route, viewport, coordinate unit, scale, theme, locale, and text scale. Verify those conditions reached the runtime subject using the adapter. Record build identity and artifact/instrument provenance. The helper records provenance but does **not** authenticate artifacts, verify hashes or collection, prove an installed build, or establish user approval; those checks remain separate.

## File contract

- Both files require `schema_version: 1` and `context` with all keys shown below. `width`, `height`, `scale`, and `text_scale` are positive finite numbers; all other context values are nonblank strings. Context values must match exactly by JSON type and value (`1` and `1.0` are the same JSON number). Different valid contexts yield mismatched (exit `1`) and support no matching-measurement conclusion; malformed or missing context yields invalid (exit `2`).
- Reference `measurements` and actual `observations` need unique nonblank `id` strings with identical ID sets. Every entry requires `provenance.artifact` and `provenance.instrument` as nonblank strings. Actual requires a nonblank `build_id`.
- Reference `kind: "numeric"` requires finite numeric `expected`, nonblank `unit`, finite nonnegative absolute `tolerance`, and a nonblank calibration `rationale`. Numeric observations require finite numeric `value` and the matching `unit`. Booleans are not numbers. Derive tolerance from project calibration, not this example or a failure you want to pass.
- Reference `kind: "exact"` compares `expected` with observation `value` using typed JSON equality, recursively: array order matters, booleans differ from numbers, and `1` equals `1.0` because both are JSON numbers. All nested numbers must be finite. Exact entries do not use numeric units or tolerances.
- Missing IDs, evidence, or required fields are invalid, not matches.

## Synthetic arithmetic example

These invented values illustrate the file format and arithmetic only. They are not Figma measurements, user approval, a universal viewport, or a recommended tolerance. The `1`-pixel band represents hypothetical prior calibration, not measured evidence for a real project.

`reference.json`:

```json
{
  "schema_version": 1,
  "context": {
    "reference_id": "synthetic-example", "revision": "demo-1",
    "fixture": "synthetic-filled", "route": "/example",
    "width": 1440, "height": 900, "unit": "css-px", "scale": 1,
    "theme": "light", "locale": "en-US", "text_scale": 1
  },
  "measurements": [
    {"id": "heading.layout.x", "kind": "numeric", "expected": 32,
     "unit": "css-px", "tolerance": 1,
     "rationale": "Synthetic only: pretend prior calibration accepts 1 px and rejects 2 px.",
     "provenance": {"artifact": "synthetic-reference.json", "instrument": "invented example"}},
    {"id": "heading.text", "kind": "exact", "expected": "Library",
     "provenance": {"artifact": "synthetic-reference.json", "instrument": "invented example"}}
  ]
}
```

`actual.json`:

```json
{
  "schema_version": 1,
  "context": {
    "reference_id": "synthetic-example", "revision": "demo-1",
    "fixture": "synthetic-filled", "route": "/example",
    "width": 1440, "height": 900, "unit": "css-px", "scale": 1,
    "theme": "light", "locale": "en-US", "text_scale": 1
  },
  "build_id": "synthetic-build-1",
  "observations": [
    {"id": "heading.layout.x", "value": 34, "unit": "css-px",
     "provenance": {"artifact": "synthetic-runtime.json", "instrument": "invented example"}},
    {"id": "heading.text", "value": "Library",
     "provenance": {"artifact": "synthetic-runtime.json", "instrument": "invented example"}}
  ]
}
```

## Compare and fix

From the skill directory:

```sh
python3 scripts/compare_measurements.py reference.json actual.json --out report.json
```

Omit `--out` to emit JSON to stdout. An output path aliasing either input is rejected without overwriting inputs. Exit codes are `0` matched, `1` mismatched, and `2` invalid. The report states its limited scope and includes per-element expected/actual values, numeric delta/tolerance, and provenance. This example mismatches: the numeric absolute delta is `2`, exceeding `1`; the text matches.

Numeric comparison preserves input JSON precision using Python's standard-library `Decimal`, with no added epsilon or tolerance. CLI reports retain JSON numbers and use UTF-8 even under an ASCII environment. If importing `compare()` directly, its report may contain `Decimal` values; use the helper's public `serialize(report)` for JSON text instead of `json.dumps(report)`.

For invalid input, fix missing evidence or collection/context errors before drawing a conformance conclusion. For a mismatch, inspect the corresponding rendered property, fix implementation, recollect actual observations under the frozen context, and rerun against the same reference and tolerances. Never widen tolerances or rebaseline a failure; an intentional design change needs the project's reference approval. Rerun affected interaction/accessibility checks and final verification separately, then retain the report with the manifest evidence. A matched report cannot substitute for the acceptance requirements in [verify.md](verify.md).
