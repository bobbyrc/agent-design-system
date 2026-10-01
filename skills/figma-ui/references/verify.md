# Verify rendered conformance

## Make the capture real

For every approved manifest entry, collect the pinned reference and actual application capture under equivalent conditions. Record build/commit identity and prove the runtime has that build installed or served. Match fixture, route/state, viewport, coordinate unit, pixel scale, theme, locale, text scaling, and applicable safe-area/system insets. Record renderer/platform versions, fonts loaded, animation state, and asset identity. Wait for the intended state and resources; do not compare a transient loading frame accidentally.

Assert required ambient conditions reached the actual subject, including root-level overlays: effective text scaling, viewport, insets, theme, and fixture. A wrapper configuration alone is insufficient. Verify applicable hardware-keyboard behavior through real Tab/focus navigation, text entry, and shortcuts; it need not display an input method or resize the viewport. For applicable on-screen input checks, prove the actual input method appeared and verify its effective occlusion, insets, and viewport behavior against the platform contract, including root-level overlays. Require a change in available layout space only when that contract expects it; floating or overlay input methods may occlude content without resizing the viewport. Verify genuine taps/pointer input, focus, and the entry state a user actually reaches. Use the real target runtime for platform-dependent rasterization, keyboards, and accessibility behavior that the test harness cannot reproduce.

## Match the instrument to the property

Compare per element and per block, then across the composition. Measure independent addends: correct total cluster width can hide a wrong text size and a wrong gap. Assertions should protect the visible property, not the nearest convenient proxy.

| Property | Evidence |
| --- | --- |
| Placement, dimensions, gaps, baseline, overflow, overlap, clipping | Independent rendered geometry/paint measurements and assertions |
| Literal text, format, order, truncation, wrap | Exact content checks plus rendered lines, bounds, and actual size |
| Typeface, weight, token role, component/variant | Loaded font identity, computed/rendered properties, repository mapping checks |
| Icon, image, crop, visible color | Asset identity and rendered evidence, with detailed crops where needed |
| Navigation, controls, focus, keyboard, semantics | Interaction tests and target-runtime observations |

Separate layout boxes, visible ink, and hit bounds. Glyph artwork can float inside an icon's layout square; a padded hit target does not establish visual alignment. Measure visible and tappable bounds separately. A fitting box can still shrink, wrap, clip, or ambiguously truncate its contents. Check the resulting glyph size and visible meaning. Raster fringes can distort absolute ink bearings; use outlines or platform paint metrics when needed and document the instrument.

## Calibrate and stress

Set `tolerance_policy` per named measurement with units, rationale, and rendering conditions. Distinguish pure geometry, shaped text compared to literals, terms shaped on both sides, and raster estimates. Calibrate against known acceptable variation and a deliberately failing case: ask what the worst passing screen would look like. Do not copy another project's thresholds or widen a band to turn a failure green.

Exercise agreed viewport/text-scale ranges and applicable platform accessibility settings with realistic long content and relevant locales. Compare equivalent fixtures for conformance; use separate stress fixtures for resilience. Verify no unreadable truncation, overlap, clipping, hidden control, or lost focus. Check applicable contrast, semantics, keyboard order, reduced motion, and touch targets through the platform's mechanisms. An accessibility scanner's pass only covers the properties it actually measures.

Use screenshot overlays/diffs as additional evidence under pinned conditions. Aggregate similarity cannot replace element checks. Record necessary exclusions and their justification; never mask a defect, rebaseline failed output, or count a changed fixture as a fix.

## Evidence and acceptance

For projects exporting named targets and independent runtime observations, the optional [measurement comparison helper](measurements.md) checks equivalent context and per-element values with calibrated tolerances. Its result covers supplied measurements only; collection authenticity, captures, build identity, interactions, accessibility, and approval still require their own evidence.

Store `reference.png`, `implementation.png`, optional `diff.png`, measurements/results, and [review.md](../assets/review.md) beneath each manifest `evidence_dir`. Provide one row per compared block/element, including passes, quoted expected/actual strings, measured numbers with provenance, and deviations. Zero findings is valid only with an explicit coverage table and evidence; do not invent defects to fill it.

When independent review is used, give a fresh reviewer the artifacts and acceptance criteria, not implementation rationale or self-report. Follow the project's reviewer/model policy. Review filters defects; it does not replace deterministic checks.

Accept only when every agreed state is captured, content/assets and mapped components/tokens match, geometry and interaction/accessibility checks pass, and no unexplained mismatch remains. Report unperformed checks and uncertainty explicitly. After fixes, rerun affected checks and final verification on the settled tree; intentional design changes need a newly approved reference.
