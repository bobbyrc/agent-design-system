# One original-design web path

This increment implements a neutral, mock-backed equipment collection/return teaching fixture. It adds a compact [entry](../skills/ui-design/SKILL.md), [decision guidance](../skills/ui-design/references/decision-record.md), [operational web profile](../profiles/web-operational.md), and one [contextual pattern](../patterns/searchable-collection-return.md). It preserves the Figma brief, manifest, approval and frozen-reference contracts. Source identities and rights boundaries are in [provenance](web-source-provenance.md).

Start with the existing brief or equivalent, record the target task and actual delegated choices, inspect the host system, and link consequential decisions. Classify observations, inferences and assumptions. Select patterns by applicability and contraindications before visual fit. Build and inspect a representative slice, then complete agreed states and checks. For repair, preserve unrelated choices and rerun affected checks plus regressions. Exploration remains an explicitly unverified deliverable; reproduction uses its approved reference workflow separately.

The runnable fixture's [brief](../examples/equipment/brief.md), [decision record](../examples/equipment/design-decision.json), [fixtures](../examples/equipment/fixtures.json) and [acceptance](../examples/equipment/acceptance.json) define this example. It has no production inventory integration or real user research. Its authored solution and teaching content must not enter held-out evaluation. The diagrams in the source pack teach composition mechanisms; they are not screenshots or proof of improvement.

## Run locally

From the repository root, use Node 24 (the tested major version) and install the pinned dependencies/browser:

```sh
npm ci
npx playwright install chromium
npm test
npm run test:browser
npm run verify:machine
```

For an interactive local preview:

```sh
npm run serve:equipment
```

Open the printed `http://127.0.0.1:<port>/examples/equipment/index.html` URL. The port is allocated dynamically. The preview serves frozen source bytes; restart after edits and stop with Ctrl-C. This command previews the teaching fixture and does not generate acceptance evidence.

The machine command serves the fixture locally, drives the browser, checks the six machine outcomes and writes a run under `artifacts/ui-runs/<UUID>/`. Its scoped success does not mean full acceptance: `VISUAL-01` remains BLOCKED until actual images receive a scoped independent review. Generated runs, screenshots, dependencies and bundles stay out of the public source tree.

```sh
npm run verify:equipment
npm run evidence:check -- artifacts/ui-runs/<UUID>/run.json
npm run evidence:review -- artifacts/ui-runs/<UUID>/run.json /absolute/reviewer-record.json
```

Replace `<UUID>` with the actual run directory. The full verification/check commands return failure while required evidence is BLOCKED. The review command imports a reviewer record matching `ui-image-review/v1`; its exact fields are documented in the [runtime contract boundary](../contracts/README.md). It must bind to current run/build/contract/image identities and record actual inspection. Do not write a fabricated review to make the gate pass. After review, rerun `evidence:check` on that same run. UI edits invalidate affected evidence; collect a fresh run rather than attaching stale images.

The contracts identify `ui-acceptance/v1`, `ui-run/v1`, and `ui-image-review/v1`. Runtime IDs are distinct from the source pack's illustrative examples. See the [runtime contract boundary](../contracts/README.md), actual schemas and runner output before preparing evidence; documentation does not authorize arbitrary fields. Required check inventory, evidence freshness, applicability and finding rules come from the frozen acceptance contract and checker. Legitimate changes are versioned/explained; removing checks or rebaselining to pass is forbidden.

Run the preserved measurement helper separately:

```sh
python3 -m unittest discover -s skills/figma-ui/scripts -p 'test_*.py'
```

Those 13 tests check supplied measurement comparisons, not browser rendering or original design quality. New unit/negative tests exercise the evidence gate; `test:browser` exercises browser regressions in actual Chromium. Neither suite proves a protected evaluation boundary.

## Evidence and completion

Record build/working-tree hash, fixture identity, acceptance hash, environment and captured artifact hashes. Test the selected-record task with store agreement; failure/retry without false success; duplicate prevention; narrow and long content; keyboard; and state-specific accessibility findings with triage. Inspect actual images for hierarchy, readability, clipping, density, component grammar and state coherence. Use independent review with artifact and criteria, without persuasive author rationale. A finding-free review needs coverage; a quota of findings is not required.

Keep task success, accessibility evidence, visual judgment and reference fidelity separate. An automated accessibility scan plus limited keyboard inspection does not establish blanket WCAG conformance or assistive-technology usability. A passing local teaching fixture does not establish quality superiority. Missing required checks or unresolved blocker/major defects remain incomplete. NOT_APPLICABLE needs an authorized applicability condition and rationale; budget exhaustion cannot produce PASS.

The app, runner and evidence files are mutable inside the builder's workspace. Hash and schema checks detect inconsistency; they cannot defeat a builder who changes collector and grader together or establish reviewer authenticity. Benchmark captures, build identity and store assertions require a protected evaluator outside that workspace or CI-controlled boundary. Do not call this local runner an independent evaluator.

The [Codex adapter](../adapters/codex.md) covers local invocation. Claude Code/Pi adapters are unverified specifications with no installed hooks/extensions, and native profiles are outside scope. Actual smoke results and pinned versions belong in run evidence and review records; merely adding adapter files proves no compatibility.
