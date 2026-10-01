# Agent design system

A reusable Figma UI workflow plus a bounded original-design web teaching path, generic design research, and independent reviews of its guidance and measurement helper. The workflow separates original design quality from reproduction fidelity and requires approval records, frozen references, deterministic checks, and independent review.

## Contents

- [UI design entry](skills/ui-design/SKILL.md): compact original/reproduction/repair/exploration routing.
- [Web workflow and runnable example](docs/web-workflow.md): local commands, state checks, evidence gate and limits. [Increment verification](docs/web-increment-verification.md) records scoped execution results.
- [Operational web profile](profiles/web-operational.md), [collection/return pattern](patterns/searchable-collection-return.md), [host adapters](adapters/README.md), and [web source provenance](docs/web-source-provenance.md).

- [Shared Figma UI skill](skills/figma-ui/SKILL.md): portable workflow, templates, harness adapters, and a measurement comparison helper.
- [Design guideline research](docs/design-guideline-research.md) and [example research](docs/design-example-research.md).
- [Measurement helper review](docs/figma-ui-measurement-review.md), [quality-target review](docs/figma-ui-quality-target-review.md), and [public-reference analysis](docs/figma-ui-reference-check.md).
- [Approved global guidance](guidance/AGENTS.md), [review evidence](guidance/EVIDENCE.md), and [shared workflow lessons](tasks/lessons.md).
- [Import provenance](docs/import-provenance.md) and [source hashes](docs/import-manifest.json).

Private application designs, artboards, screenshots, project evaluations and mixed historical reports are excluded. The explicitly authorized neutral equipment example is a public teaching fixture; generated screenshots and run evidence remain untracked. Teaching examples are excluded from held-out evaluation.

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

## Original web teaching path

From the repository root with Node 22 or later:

```sh
npm ci
npx playwright install chromium
npm test
npm run test:browser
npm run verify:machine
```

For a local preview, run `npm run serve:equipment` and open the printed `http://127.0.0.1:<port>/examples/equipment/index.html` URL. Restart after edits; Ctrl-C stops the server.

The machine command reports scoped machine checks and writes `artifacts/ui-runs/<UUID>/run.json`; independent actual-image review remains required for full acceptance. `npm run verify:equipment` and `npm run evidence:check -- artifacts/ui-runs/<UUID>/run.json` fail while required evidence is BLOCKED. Follow [web workflow](docs/web-workflow.md) for review import and fresh checks after edits. The local runner and evidence are builder-writable bookkeeping; benchmark grading needs a protected evaluator. No quality superiority or blanket accessibility conformance follows from this fixture.

The new repository skill is not globally installed. Select [skills/ui-design/SKILL.md](skills/ui-design/SKILL.md) explicitly or adopt it through the host’s supported project skill mechanism. Codex local execution is the initial smoke scope; Claude Code/Pi are specified but unverified, with no completion hooks supplied. Native platforms are outside this web increment. No repository license has been selected.
