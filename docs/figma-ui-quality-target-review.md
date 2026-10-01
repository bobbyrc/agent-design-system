# Independent defect review

Reviewed `references/quality.md`, `references/design.md`, and `assets/design-brief.md` in one bounded pass. This review concerns text guidance; it does not establish design-generation quality.

## Finding

**Medium — the caller still requires two evidence classes.**

Location: `/Users/bcraig/.agents/skills/figma-ui/references/design.md:9`.

Evidence: “Inspect task-relevant screen examples **and** an applicable guideline family” requires both classes whenever visual-quality targets are set. This conflicts with `references/quality.md:7`, which says evidence roles are “alternatives or complements, not a required set” and permits reusing established project evidence without another exploration round. For a bounded hierarchy correction supported by an existing project screen or a directly applicable craft example, the caller still requires acquiring an additional guideline family. That creates redundant process and an effective minimum evidence set.

Correction: make the caller defer evidence selection to the guide and explicitly allow relevant established evidence. For example: “Use relevant inspected evidence, including established project references where sufficient, then record specific mechanisms to transfer and observable targets in the brief.”

No other substantive defect identified in this pass. External source descriptions were not independently reverified.

## Closure recheck

Verified the settled `references/design.md:9` now says: “Select applicable evidence as described there, reusing established inspected evidence where sufficient”. It defers evidence selection to `quality.md:7` and no longer requires both screen examples and a guideline family. The finding is resolved. This recheck covers only the affected optional-evidence interaction; no broader verification is implied.
