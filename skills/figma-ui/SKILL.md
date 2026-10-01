---
name: figma-ui
description: Design native Figma UI, implement an approved reference, and verify application conformance with itemized evidence. Use for Figma-led UI work across web and native projects; keep each project's visual system and runtime adapter local.
---

# Figma UI workflow

Use Figma as the named design reference and the running application as implementation evidence. Original design quality and reproduction fidelity are separate judgments: a faithful reconstruction can reproduce a poor design. Neither a prompt nor a successful skill validation proves either judgment.

## Select the stage

- **Improve this workflow or skill:** treat the skill as the deliverable. Use a named pilot only as bounded evidence for the requested workflow checks; selecting a pilot app does not select its target screen or authorize product delivery. If the user redirects work to the skill, stop app and Figma actions and work from existing evidence.
- **Design or change the reference:** read [design](references/design.md). Start here when approval, screen-state coverage, or a consequential design choice is missing.
- **Build from approved nodes:** read [implement](references/implement.md), then [verify](references/verify.md) before choosing implementation checks.
- **Audit or accept a running UI:** read [verify](references/verify.md).
- **Set up another agent harness:** read [harnesses](references/harnesses.md). The procedure below depends on capabilities, not a particular tool name.

For product work, read project policy, relevant lessons, the design system, the reference manifest, and the runtime adapter before work. Establish the requested target surface and task separately from the screens used as visual precedent; honor choices already made. Clarify a missing consequential target with bounded, structured options before native design. Routine runtime assumptions can be recorded and checked without a new approval gate. Suggested project files are `ui-reference/manifest.json`, `design-decisions.md`, and `adapter.md`; preserve an established equivalent. Templates: [project policy](assets/project-policy.md), [manifest](assets/manifest.example.json), [adapter](assets/adapter.md), [brief](assets/design-brief.md), and [review](assets/review.md).

## Shared contract

1. Identify exact screen-state nodes, including selected assets. A file or section may contain rejected alternatives; proximity to an approved frame does not imply approval.
2. Record the user or delegated approval owner's actual decision and its scope before marking a reference `approved`. A style-only choice does not approve a target surface, unfinished states, or implementation; a decision that also covers concrete frames, states, and implementation counts at that broader scope without another ceremony. Templates contain examples, not approval evidence. Respect an existing delegation instead of repeatedly requesting approval.
3. Freeze approved captures, metadata, assets, and revision identity. Implementation must not edit that reference to erase a mismatch. A changed direction needs a new approval record and reference revision; retain the old evidence as `superseded`.
4. Use project-native tokens, components, layout, and accessibility mechanisms. Do not import universal aesthetic rules, device sizes, pixel tolerances, or another project's conventions.
5. Completion requires deterministic checks and itemized comparison of actual rendered states. Self-review, an aggregate screenshot score, and a reviewer report alone do not establish conformance.

Discover available capabilities for native Figma reads/writes, snapshots, metadata, assets, repository inspection, runtime capture, tests, and review. Follow any mandatory tool-specific skill instructions in the current environment; this skill does not require those skills to be installed. Verify access before depending on a capability. Missing access is a reported prerequisite, never permission to invent IDs, substitute fonts, or claim an unperformed check.
