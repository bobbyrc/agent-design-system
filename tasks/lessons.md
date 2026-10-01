# Lessons

- Keep shared agent workflows harness-neutral in one canonical skill; put Codex, Claude Code, and Pi discovery, invocation, model, and tool differences in adapters instead of maintaining three drifting copies.

- Once architecture is approved and the user chooses a pilot, record routine runtime choices as working assumptions; do not add a new scope or cost-cap approval gate unless a consequential unresolved choice actually requires it. Choosing an app does not authorize a consequential target-surface choice: distinguish a visual precedent from the requested target, and resolve that choice before designing. Preserve design-selection approval before implementation.

- Before choosing a CLI for a task, check the current harness for an applicable native plugin and state that it takes precedence; use a CLI fallback only when none applies.

- Compare design alternatives with equal content, state, size and coverage; show extra state coverage separately from the primary options. Native construction and no blocking defects do not establish polished design quality. Evaluate visual hierarchy, density, typography, rhythm and product fit before asking for selection; the user's quality verdict overrides a reviewer pass. (2026-09-29)

- When improving a shared skill, keep any app pilot bounded to evidence needed for the skill. If the user redirects work to the skill, stop app design and implementation, record exploratory artifacts accurately, and review the skill's behavior before resuming a pilot. A style selection does not approve a reference for a different surface. (2026-09-29)


- A design-system repository contains reusable workflow and research. Do not include application designs, artboards, screenshots, or project evaluations unless the user explicitly requests those artifacts. Confirm artifact scope before interpreting “all design-system work” as permission to import application-specific evidence. (2026-10-01)

- A skill that links to sibling repository files must state checkout-only adoption and scope in its entry and usage docs. Do not imply standalone host installation works, and distinguish web direct-to-code routing from Figma-led work.

- Keep reusable verification documentation reproducible rather than recording a “current” run. Put run identities, observed counts, versions and exact-head CI outcomes in the PR; runtime support claims must match the exercised major version.

- Capture and inspect both collections and task details under enlarged text. Passing overflow, geometry or axe checks does not establish readable composition. Tie regression assertions to required content and behavior rather than arbitrary system-font pixel heights.

- Cross-check evidence payload bindings and recorded failures against summaries. A builder-writable evaluator boundary does not justify accepting contradictory PASS metadata; preserve honest FAIL, BLOCKED and authorized NOT_APPLICABLE outcomes.
