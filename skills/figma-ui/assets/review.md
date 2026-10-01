# Conformance evidence — project template

- Reference ID, file/node, revision, and approval evidence: `<identities/paths>`.
- Runtime build identity and proof: `<identity and observation>`.
- Capture configuration, fixture, effective conditions, font/asset proof: `<record>`.
- Artifacts: `<reference, implementation, diff, measurement paths>`.
- Agreed acceptance criteria and tolerance policy: `<paths>`.

## Itemized comparison

| Block/element | Property/instrument | Expected | Actual | Delta/tolerance | Result/evidence |
| --- | --- | --- | --- | --- | --- |
| `<identity>` | `<bounds/text/token/asset/etc.>` | `<quoted string or measured value>` | `<quoted string or measured value>` | `<units/rationale>` | `<pass or precise mismatch and artifact>` |

Add one row per compared property; include passes. Separate fixture differences from defects. Record layout, ink, and hit bounds independently where relevant. Explain measurement provenance and exclusions. Zero findings requires the completed coverage table.

## Behavior, accessibility, and stress coverage

| State/configuration | Check and effective-condition proof | Result/evidence |
| --- | --- | --- |
| `<manifest ID or stress case>` | `<interaction, focus, keyboard, scale, clipping, semantics, etc.>` | `<command/result/capture>` |

## Rulings and remaining work

- Mismatch cause and which artifact needs correction: `<evidence-backed ruling>`.
- Reference changes and approval, if any: `<new revision and superseded identity>`.
- Fixes and repeated affected/final checks: `<commands and results>`.
- Unperformed checks, unavailable capabilities, and uncertainty: `<explicit gaps>`.
- Acceptance owner and outcome: `<actual decision, not a template assertion>`.
