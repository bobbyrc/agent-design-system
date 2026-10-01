# Runtime adapter — project template

Replace example placeholders with tested project details. This adapter defines reproducible commands and observations; it is not a record of checks already performed.

## Commands and build identity

- Working directory and dependency/tool versions: `<paths and versions>`.
- Launch/build/install commands: `<exact commands>`.
- Proof of installed/served build: `<commit/build marker and how to read it>`.
- Test, capture, and measurement commands: `<exact commands and output paths>`.
- Optional named-measurement comparison: `<collection/export commands, frozen reference path, actual path, and compare_measurements.py command/report path; see ../references/measurements.md if used>`.
- Target runtimes and capabilities unavailable in the harness: `<platforms and gaps>`.

## Data and states

- Fixture loading/reset command and fixture provenance: `<recipe>`.
- Route or native navigation recipes keyed to manifest entries: `<recipes>`.
- Conditions proving the intended state arrived: `<visible/data assertions>`.
- Long-content/localization fixtures and stress configuration matrix: `<paths and cases>`.

## Fonts and assets

- Exact family/face/weight, font files, and runtime load proof: `<identities and checks>`.
- Asset paths, hashes/source nodes, dimensions, and crops: `<inventory>`.
- Component map location and repository revision checked: `<path and revision>`.

## Rendering and input

- Viewport, coordinate units, pixel ratio, theme, locale, text scaler: `<settings and read-back assertions>`.
- Safe areas/system chrome, animation settling, renderer versions: `<settings>`.
- Root-overlay condition propagation: `<assertions>`.
- Hardware-keyboard Tab/focus, text-entry, and shortcut checks: `<recipe and evidence; explicitly mark inapplicable checks>`.
- On-screen input-method appearance and focus proof: `<recipe and evidence; explicitly mark if inapplicable>`.
- On-screen input occlusion/inset/viewport behavior, including root overlays: `<expected platform behavior and actual observations; require layout-space change only where expected; explicitly mark if inapplicable>`.
- Screenshot/export format, stabilization, and reference preservation: `<commands and hashes>`.

## Test setup and tolerance policy

- Native layout/paint/ink/hit-bound instruments: `<APIs or helpers>`.
- Exact strings/format, wrapping, clipping, glyph size checks: `<tests>`.
- Token/component and asset identity guards: `<tests>`.
- Behavior and accessibility tests plus target-runtime pass: `<coverage>`.
- Tolerances per measurement, units, rationale, calibration failures, and exclusions: `<policy path>`.
- Known differences between tests and runtime and how each is closed: `<table>`.
