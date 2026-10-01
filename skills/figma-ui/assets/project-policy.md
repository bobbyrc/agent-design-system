# Project AGENTS.md snippet — customize before adoption

## UI design and conformance

Use the shared `figma-ui` skill for this project's Figma-led UI work. Project configuration:

- Design system: `<project path>`.
- Reference manifest and approval evidence: `ui-reference/manifest.json` and `ui-reference/design-decisions.md`.
- Runtime adapter: `ui-reference/adapter.md`.
- Approval owner and delegated decision scope: `<name/role and scope>`.

Implement only evidence-backed approved screen-state nodes and pinned revisions. Missing design choices return to design within the recorded approval scope. Preserve approved references during implementation; intentional changes require a newly approved revision. Completion requires itemized rendered comparisons, deterministic checks, and behavior/accessibility evidence for the agreed configurations. Follow project-specific tokens, components, and tolerances.
