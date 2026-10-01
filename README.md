# Agent design system

A versioned snapshot of a shared Figma UI workflow, generic design research, and independent reviews of its reusable guidance and measurement helper. The workflow separates original design quality from reproduction fidelity and requires approval records, frozen references, deterministic checks, and independent review.

## Contents

- [Shared Figma UI skill](skills/figma-ui/SKILL.md): portable workflow, templates, harness adapters, and a measurement comparison helper.
- [Design guideline research](docs/design-guideline-research.md) and [example research](docs/design-example-research.md).
- [Measurement helper review](docs/figma-ui-measurement-review.md), [quality-target review](docs/figma-ui-quality-target-review.md), and [public-reference analysis](docs/figma-ui-reference-check.md).
- [Approved global guidance](guidance/AGENTS.md), [review evidence](guidance/EVIDENCE.md), and [shared workflow lessons](tasks/lessons.md).
- [Import provenance](docs/import-provenance.md) and [source hashes](docs/import-manifest.json).

Application-specific designs, artboards, screenshots, project evaluations, and mixed historical reports are excluded. This repository contains reusable workflow and research.

## Use across agent harnesses

The existing installation uses one canonical directory at `~/.agents/skills/figma-ui`. Codex and Pi discover it there; Claude Code uses a directory link at `~/.claude/skills/figma-ui`. Explicit invocations are `$figma-ui` in Codex, `/figma-ui` in Claude Code, and `/skill:figma-ui` in Pi. See the [harness adapter](skills/figma-ui/references/harnesses.md) for the checked versions and their differences. It records the September 2026 setup, not a guarantee about future harness versions.

To adopt the repository skill, use `skills/figma-ui` as the source for your harness's supported user or project skill location. Avoid competing copies with the same skill name. Keep the project's visual system, runtime adapter, reference manifest, and acceptance thresholds in that project. The templates supply missing structure, not universal visual rules or approval evidence.

Skill installation supplies instructions. Figma tools and authentication must be configured and authorized separately in each harness; credentials and connection settings are not included here.

## Scope and limitations

This import does not modify the separately installed canonical skill or its existing links. The repository is a versioned snapshot of that source and generic supporting evidence, rather than an automatic installation or source-of-truth migration.

The workflow is not proof of visual quality or application conformance. Full end-to-end Figma execution across Codex, Claude Code, and Pi remains unproven. Consult each review for its scope and limitations; product delivery still needs project-specific approvals, rendered-state evidence, deterministic checks, and independent review.

## Local helper checks

Run the measurement helper's 13 unit tests from the repository root:

```sh
python3 -m unittest discover -s skills/figma-ui/scripts -p 'test_*.py'
```

These check deterministic measurement comparisons. They do not establish visual quality, application conformance, or Figma access.
